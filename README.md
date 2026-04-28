# LUCT Reporter

Expo React Native app for lecture monitoring, reporting, attendance, and ratings.

## Clear Structure

```text
thrilled-indigo-hummus/
|-- App.js
|-- index.js
|-- src/
|   |-- components/
|   |   |-- AppUI.js
|   |-- config/
|   |   |-- firebase.js
|   |-- context/
|   |   |-- AuthContext.js
|   |-- navigation/
|   |   |-- AppNavigator.js
|   |-- prospectusData/
|   |   |-- prospectusCatalog.js
|   |-- reportForm/
|   |   |-- ReportFormFields.js
|   |-- screens/
|   |   |-- LoginScreen.js
|   |   |-- RoleNavigator.js
|   |   |-- StudentScreen.js
|   |   |-- LecturerScreen.js
|   |   |-- PRLScreen.js
|   |   |-- PLScreen.js
|   |-- services/
|   |   |-- firestore.js
|   |-- sharedComponents/
|   |   |-- SharedComponents.js
|   |-- utils/
|   |   |-- academicStructure.js
```

## What Each Part Does

- Frontend entry: `App.js`
- Navigation: `src/navigation/AppNavigator.js`
- Role switching: `src/screens/RoleNavigator.js`
- Screens and UI pages: `src/screens/`
- Reusable UI pieces: `src/components/` and `src/sharedComponents/`
- Firebase setup: `src/config/firebase.js`
- Firebase auth/session logic: `src/context/AuthContext.js`
- Firebase Firestore API layer: `src/services/firestore.js`
- Academic helper logic: `src/utils/academicStructure.js`

## Important Files

### Frontend

- `src/screens/LoginScreen.js`
- `src/screens/StudentScreen.js`
- `src/screens/LecturerScreen.js`
- `src/screens/PRLScreen.js`
- `src/screens/PLScreen.js`

### Firebase

- Config: `src/config/firebase.js`
- Auth: `src/context/AuthContext.js`
- Firestore API: `src/services/firestore.js`

## Notes

- If you want all Firebase read/write code in one place, keep moving Firestore queries from screens into `src/services/firestore.js`.
- `src/services/firestore.js` is now the main file to grow for collection queries like classes, reports, ratings, attendance, and users.
