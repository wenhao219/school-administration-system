import Teacher from "./Teacher";
import Student from "./Student";
import Class from "./Class";
import Subject from "./Subject";
import Enrollment from "./Enrollment";

Teacher.hasMany(Enrollment, {
  foreignKey: "teacherId",
  as: "enrollments",
});

Student.hasMany(Enrollment, {
  foreignKey: "studentId",
  as: "enrollments",
});

Class.hasMany(Enrollment, {
  foreignKey: "classId",
  as: "enrollments",
});

Subject.hasMany(Enrollment, {
  foreignKey: "subjectId",
  as: "enrollments",
});

Enrollment.belongsTo(Teacher, {
  foreignKey: "teacherId",
  as: "teacher",
});

Enrollment.belongsTo(Student, {
  foreignKey: "studentId",
  as: "student",
});

Enrollment.belongsTo(Class, {
  foreignKey: "classId",
  as: "classInfo",
});

Enrollment.belongsTo(Subject, {
  foreignKey: "subjectId",
  as: "subject",
});

export { Teacher, Student, Class, Subject, Enrollment };
