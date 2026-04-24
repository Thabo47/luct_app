export function getModuleLabel(item) {
  return item?.className || item?.moduleName || item?.courseName || 'Module';
}

export function getModuleCode(item) {
  return item?.moduleCode || item?.courseCode || item?.id || '--';
}

export function getCourseLabel(item) {
  if (!item?.courseName && !item?.courseCode) {
    return 'Course not set';
  }
  return `${item.courseName || 'Course'} (${item.courseCode || '--'})`;
}

export function normalizeModule(item = {}) {
  return {
    ...item,
    moduleName: getModuleLabel(item),
    moduleCode: getModuleCode(item),
    courseLabel: getCourseLabel(item),
  };
}

export function normalizeReport(item = {}) {
  return {
    ...item,
    moduleName: getModuleLabel(item),
    moduleCode: getModuleCode(item),
    courseLabel: getCourseLabel(item),
  };
}

export function moduleMatchesStudentCourse(moduleItem, profile) {
  if (!moduleItem || !profile?.facultyName) {
    return false;
  }

  if (moduleItem.facultyName !== profile.facultyName) {
    return false;
  }

  if (profile.courseCode) {
    return moduleItem.courseCode === profile.courseCode;
  }

  if (profile.courseName) {
    return moduleItem.courseName === profile.courseName;
  }

  return true;
}
