# LUCT Reporter

Expo React Native app for lecture monitoring, reporting, attendance, and ratings.

## Clear Structure

```text
thrilled-indigo-hummus/
|-- App.js
|-- index.js
|-- src/
|   |-- backend/
|   |   |-- firebase/
|   |   |   |-- config.js
|   |   |   |-- firestore.js
|   |-- components/
|   |   |-- AppUI.js
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
- Backend folder: `src/backend/`
- Firebase setup: `src/backend/firebase/config.js`
- Firebase auth/session logic: `src/context/AuthContext.js`
- Firebase Firestore API layer: `src/backend/firebase/firestore.js`
- Academic helper logic: `src/utils/academicStructure.js`

## Important Files

### Frontend

- `src/screens/LoginScreen.js`
- `src/screens/StudentScreen.js`
- `src/screens/LecturerScreen.js`
- `src/screens/PRLScreen.js`
- `src/screens/PLScreen.js`

### Firebase

- Config: `src/backend/firebase/config.js`
- Auth: `src/context/AuthContext.js`
- Firestore API: `src/backend/firebase/firestore.js`


