// Prospectus-backed catalog used by selectors across the app.
// These entries are seeded from the assignment scope plus public LUCT faculty
// listings and can be refined further against the full prospectus text.
export const prospectusCatalog = [
  {
    id: 'fict',
    name: 'Faculty of Information Communication Technology',
    courses: [
      {
        id: 'bsc-software-engineering-multimedia',
        name: 'Bsc Degree in Software Engineering with Multimedia',
        code: 'BSEM',
      },
      {
        id: 'bsc-information-technology',
        name: 'Bsc Degree in Information Technology',
        code: 'BIT',
      },
      {
        id: 'bsc-computer-science',
        name: 'Bsc Degree in Computer Science',
        code: 'BCS',
      },
      {
        id: 'diploma-information-technology',
        name: 'Diploma in Information Technology',
        code: 'DIT',
      },
    ],
  },
  {
    id: 'fbmg',
    name: 'Faculty of Business Management and Globalization',
    courses: [
      {
        id: 'bba-business-management',
        name: 'Bachelors in Business Management',
        code: 'BBM',
      },
      {
        id: 'bba-international-business',
        name: 'Bachelors in International Business',
        code: 'BIB',
      },
      {
        id: 'diploma-business-management',
        name: 'Diploma in Business Management',
        code: 'DBM',
      },
      {
        id: 'diploma-marketing',
        name: 'Diploma in Marketing',
        code: 'DMK',
      },
    ],
  },
  {
    id: 'fcmb',
    name: 'Faculty of Communication, Media and Broadcasting',
    courses: [
      {
        id: 'bmc-media-communication',
        name: 'Bachelors in Media and Communication',
        code: 'BMC',
      },
      {
        id: 'bmc-broadcast-journalism',
        name: 'Bachelors in Broadcast Journalism',
        code: 'BBJ',
      },
      {
        id: 'diploma-broadcasting',
        name: 'Diploma in Broadcasting',
        code: 'DBR',
      },
      {
        id: 'diploma-public-relations',
        name: 'Diploma in Public Relations',
        code: 'DPR',
      },
    ],
  },
  {
    id: 'fabe',
    name: 'Faculty of Architecture and the Built Environment',
    courses: [
      {
        id: 'barch-architecture',
        name: 'Bachelors in Architecture',
        code: 'BARC',
      },
      {
        id: 'bids-interior-design',
        name: 'Bachelors in Interior Design',
        code: 'BID',
      },
      {
        id: 'bqs-quantity-surveying',
        name: 'Bachelors in Quantity Surveying',
        code: 'BQS',
      },
      {
        id: 'diploma-architecture',
        name: 'Diploma in Architecture',
        code: 'DARC',
      },
    ],
  },
  {
    id: 'fflc',
    name: 'Faculty of Fashion and Lifestyle Creativity',
    courses: [
      {
        id: 'bfd-fashion-design',
        name: 'Bachelors in Fashion Design',
        code: 'BFD',
      },
      {
        id: 'blc-lifestyle-design',
        name: 'Bachelors in Lifestyle Design',
        code: 'BLD',
      },
      {
        id: 'diploma-fashion-design',
        name: 'Diploma in Fashion Design',
        code: 'DFD',
      },
    ],
  },
  {
    id: 'fce',
    name: 'Faculty of Creative Engineering',
    courses: [
      {
        id: 'beng-civil-engineering',
        name: 'Bachelors in Civil Engineering',
        code: 'BCE',
      },
      {
        id: 'beng-electrical-electronics',
        name: 'Bachelors in Electrical and Electronics Engineering',
        code: 'BEEE',
      },
      {
        id: 'diploma-civil-engineering',
        name: 'Diploma in Civil Engineering',
        code: 'DCE',
      },
    ],
  },
];

export function findFacultyByName(name) {
  return prospectusCatalog.find((faculty) => faculty.name === name) || null;
}

export function findFacultyById(id) {
  return prospectusCatalog.find((faculty) => faculty.id === id) || null;
}

export function findCourseByName(courseName) {
  for (const faculty of prospectusCatalog) {
    const course = faculty.courses.find((item) => item.name === courseName);
    if (course) {
      return { faculty, course };
    }
  }
  return null;
}

export function findCourseByCode(courseCode) {
  const normalizedCode = courseCode?.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  for (const faculty of prospectusCatalog) {
    const course = faculty.courses.find((item) => item.code?.trim().toUpperCase() === normalizedCode);
    if (course) {
      return { faculty, course };
    }
  }

  return null;
}

export function getFacultyOptions() {
  return prospectusCatalog.map((faculty) => ({
    value: faculty.id,
    label: faculty.name,
  }));
}

export function getCourseOptionsForFaculty(facultyId) {
  const faculty = findFacultyById(facultyId);
  return (faculty?.courses || []).map((course) => ({
    id: course.id,
    courseCode: course.code || course.name,
    courseName: course.name,
  }));
}
