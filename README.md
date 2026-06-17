# テスナビ

テスト勉強の計画を作成する1ページWebアプリです。

## 初回管理者の設定方法

管理者メールアドレスはHTMLやJavaScriptに直書きしません。管理者判定は、ログイン中ユーザーの `users/{uid}/role` を参照します。

1. Firebase Console を開く
2. Realtime Database の `users` ノードを開く
3. 管理者にしたいユーザーの `uid` を確認する
4. `users/{uid}/role` に `"admin"` を設定する
5. そのユーザーでログインすると `admin.html` が見られる

本番運用では、フロントエンドの表示制御だけでなく、Firebase Security Rules または Custom Claims で管理者権限を必ず保護してください。

## Realtime Database Rules 例

```json
{
  "rules": {
    "adminData": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "tesnavi": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'",
      ".write": "auth != null"
    },
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

## Firestore Rules 例

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    match /adminData/{document=**} {
      allow read, write: if isAdmin();
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if isAdmin();
    }
  }
}
```
