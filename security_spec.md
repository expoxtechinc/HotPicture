# Security Specification: HotPic Firestore Rules

This project implements Attribute-Based Access Control (ABAC) and Zero-Trust Firestore Security for the "HotPic" image uploading and approval app.

## 1. Data Invariants

1. **Authentication Rule**: No anonymous uploads. Only email-verified authenticated users can upload pictures or perform likes.
2. **Uploader Authenticity**: The `uploaderId` and `uploaderEmail` in any created picture document must match the authenticating user's UID and email exactly.
3. **Pre-Approval Control**: Standard users cannot set their upload status to `approved` or `rejected`. Standard user uploads are forced to the `pending` status.
4. **Admin Pre-Approval**: Only authenticated admins (such as `luckyglobalnews@gmail.com`) can upload pictures that are pre-approved (`status: 'approved'`).
5. **Role Honesty**: Non-admins cannot set `uploaderRole` to `admin`.
6. **State Immutability**: All fields in a picture (such as `id`, `imageUrl`, `title`, `uploaderId`, `category`, etc.) are read-only after creation. Only the `likes` field can be modified by standard users (Action: Like), and only `status`, `approvedBy`, and `approvedAt` can be modified by admins (Action: Review).
7. **Temporal Integrity**: All created or approved timestamps must match the server timestamp (`request.time`).
8. **Secure Reads**: Non-approved pictures are completely hidden from the public view and other standard users. Only the uploader or an admin can access a `pending` or `rejected` picture.
9. **Single-Like constraint**: A user can only like a picture once. This is enforced by tracking the `userId` as the document ID in the picture's `likes` subcollection.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 malicious payloads and query permutations designed to compromise the security invariants of HotPic, which must return `PERMISSION_DENIED`:

### Payload 1: Uploader Spoofing (Identity Theft)
*   **Target Path**: `/pictures/malicious_pic`
*   **User Action**: Create
*   **User Claims**: UID=`hacker_123`, Email=`hacker@gmail.com`
*   **Attack Body**:
    ```json
    {
      "id": "malicious_pic",
      "title": "Nice Dog",
      "description": "Lovely animal.",
      "imageUrl": "https://picsum.photos/seed/dog/800/600",
      "uploaderId": "innocent_victim_uid",
      "uploaderName": "Innocent Victim",
      "uploaderEmail": "victim@gmail.com",
      "uploaderRole": "user",
      "status": "pending",
      "createdAt": "request.time",
      "likes": 0,
      "category": "Nature"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (UID in body does not match actual `request.auth.uid`).

### Payload 2: Self-Approval (Privilege Escalation)
*   **Target Path**: `/pictures/self_approved_pic`
*   **User Action**: Create
*   **User Claims**: UID=`regular_user_777`, Email=`regular@gmail.com` (verified)
*   **Attack Body**:
    ```json
    {
      "id": "self_approved_pic",
      "title": "Unapproved Content",
      "description": "Skipping moderation.",
      "imageUrl": "https://picsum.photos/seed/secret/800/600",
      "uploaderId": "regular_user_777",
      "uploaderName": "Regular User",
      "uploaderEmail": "regular@gmail.com",
      "uploaderRole": "user",
      "status": "approved",
      "createdAt": "request.time",
      "likes": 0,
      "category": "Nature"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Regular user attempts to create a document with `status == 'approved'`).

### Payload 3: Role Spoofing (Falsely Claiming Admin Role)
*   **Target Path**: `/pictures/fake_admin_pic`
*   **User Action**: Create
*   **User Claims**: UID=`regular_user_777`, Email=`regular@gmail.com` (verified)
*   **Attack Body**:
    ```json
    {
      "id": "fake_admin_pic",
      "title": "Hacked Status",
      "description": "Pre-approved upload.",
      "imageUrl": "https://picsum.photos/seed/fake/800/600",
      "uploaderId": "regular_user_777",
      "uploaderName": "Hacked User",
      "uploaderEmail": "regular@gmail.com",
      "uploaderRole": "admin",
      "status": "approved",
      "createdAt": "request.time",
      "likes": 0,
      "category": "Nature"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Regular user cannot set their uploaderRole to `admin`).

### Payload 4: Fake Timestamp Injection (Temporal Tampering)
*   **Target Path**: `/pictures/backdated_pic`
*   **User Action**: Create
*   **User Claims**: UID=`user_abc`, Email=`abc@gmail.com` (verified)
*   **Attack Body**:
    ```json
    {
      "id": "backdated_pic",
      "title": "Old Photo",
      "description": "Setting old date.",
      "imageUrl": "https://picsum.photos/seed/old/800/600",
      "uploaderId": "user_abc",
      "uploaderName": "User ABC",
      "uploaderEmail": "abc@gmail.com",
      "uploaderRole": "user",
      "status": "pending",
      "createdAt": "2020-01-01T00:00:00Z",
      "likes": 0,
      "category": "Nature"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (`createdAt` must match server timestamp `request.time`).

### Payload 5: Initial Likes Forging (Popularity Swell)
*   **Target Path**: `/pictures/highly_liked_initial`
*   **User Action**: Create
*   **User Claims**: UID=`user_abc`, Email=`abc@gmail.com` (verified)
*   **Attack Body**:
    ```json
    {
      "id": "highly_liked_initial",
      "title": "Cheated Popularity",
      "description": "Starting with 9999 likes.",
      "imageUrl": "https://picsum.photos/seed/cheat/800/600",
      "uploaderId": "user_abc",
      "uploaderName": "User ABC",
      "uploaderEmail": "abc@gmail.com",
      "uploaderRole": "user",
      "status": "pending",
      "createdAt": "request.time",
      "likes": 9999,
      "category": "Nature"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (`likes` must be strictly `0` on creation).

### Payload 6: Title Content Injection (Aversely Large Data)
*   **Target Path**: `/pictures/bloated_title`
*   **User Action**: Create
*   **User Claims**: UID=`user_abc`, Email=`abc@gmail.com` (verified)
*   **Attack Body**:
    ```json
    {
      "id": "bloated_title",
      "title": "[1000 characters of gibberish...]",
      "description": "Standard",
      "imageUrl": "https://picsum.photos/seed/bloat/800/600",
      "uploaderId": "user_abc",
      "uploaderName": "User ABC",
      "uploaderEmail": "abc@gmail.com",
      "uploaderRole": "user",
      "status": "pending",
      "createdAt": "request.time",
      "likes": 0,
      "category": "Nature"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (`title` string length bounds check failed).

### Payload 7: Unauthorized Moderator Work (Reviewing Own Pictures)
*   **Target Path**: `/pictures/user_pic_1`
*   **User Action**: Update
*   **User Claims**: UID=`user_abc`, Email=`abc@gmail.com` (verified)
*   **Existing Doc**: `status`='pending', `uploaderId`='user_abc'
*   **Attack Body**:
    ```json
    {
      "id": "user_pic_1",
      "title": "My Post",
      "description": "Standard",
      "imageUrl": "https://picsum.photos/seed/mine/800/600",
      "uploaderId": "user_abc",
      "uploaderName": "User ABC",
      "uploaderEmail": "abc@gmail.com",
      "uploaderRole": "user",
      "status": "approved",
      "createdAt": "request.time",
      "likes": 0,
      "category": "Nature",
      "approvedBy": "user_abc",
      "approvedAt": "request.time"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (User is trying to change status to approved, which requires `isAdmin()`).

### Payload 8: Image URL Tampering on Existing Item
*   **Target Path**: `/pictures/approved_pic_1`
*   **User Action**: Update
*   **User Claims**: UID=`user_abc`, Email=`abc@gmail.com` (verified)
*   **Existing Doc**: `status`='approved', `uploaderId`='user_abc', `imageUrl`='https://picsum.photos/ok'
*   **Attack Body**:
    ```json
    {
      "id": "approved_pic_1",
      "title": "My Post",
      "description": "Standard",
      "imageUrl": "https://hackedurl.com/unsafe-image.png",
      "uploaderId": "user_abc",
      "uploaderName": "User ABC",
      "uploaderEmail": "abc@gmail.com",
      "uploaderRole": "user",
      "status": "approved",
      "createdAt": "request.time",
      "likes": 0,
      "category": "Nature"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Modifying immutable fields after creation is forbidden).

### Payload 9: Invalid Like Count Jump (Symmetric Modification Break)
*   **Target Path**: `/pictures/approved_pic_1`
*   **User Action**: Update
*   **User Claims**: UID=`other_user_888`, Email=`other@gmail.com` (verified)
*   **Existing Doc**: `status`='approved', `likes`=10
*   **Attack Body**:
    ```json
    {
      "id": "approved_pic_1",
      "title": "Beautiful Photo",
      "description": "Pretty scenery.",
      "imageUrl": "https://picsum.photos/seed/pretty/800/600",
      "uploaderId": "user_abc",
      "uploaderName": "User ABC",
      "uploaderEmail": "abc@gmail.com",
      "uploaderRole": "user",
      "status": "approved",
      "createdAt": "request.time",
      "likes": 99,
      "category": "Nature"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Cannot jump liked count by more than +/- 1).

### Payload 10: Anonymous User Creation Attempt
*   **Target Path**: `/pictures/anon_pic_1`
*   **User Action**: Create
*   **User Claims**: None (Anonymous or Unauthenticated)
*   **Attack Body**: Standard picture fields.
*   **Expected Result**: `PERMISSION_DENIED` (User is not logged in).

### Payload 11: Unverified Email Write Block
*   **Target Path**: `/pictures/unverified_user_pic`
*   **User Action**: Create
*   **User Claims**: UID=`user_unverified`, Email=`unverified@gmail.com`, EmailVerified=`false`
*   **Attack Body**: Standard pending picture.
*   **Expected Result**: `PERMISSION_DENIED` (Requires `email_verified == true`).

### Payload 12: Insecure Query Search Bypass (Query Scrape)
*   **Target Path**: `/pictures`
*   **User Action**: List / Query
*   **User Claims**: UID=`hacker_123`, Email=`hacker@gmail.com`
*   **Attack query**: All pictures (unfiltered, attempting to scrape pending/rejected uploads of other users).
*   **Expected Result**: `PERMISSION_DENIED` (Rules require reading list to only return `status == 'approved'` or uploaderId matches, client requested all which misses index boundaries, or results in permission denied when unauthorized docs are present in the list match block evaluation).

---

## 3. Test Runner Specification

The test runner file `firestore.rules.test.ts` validates that the above attacks fail immediately at the database layer.
