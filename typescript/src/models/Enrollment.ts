import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface EnrollmentAttributes {
  id: number;
  teacherId: number;
  subjectId: number;
  studentId: number;
  classId: number;
}

interface EnrollmentCreationAttributes
  extends Optional<EnrollmentAttributes, "id"> {}

class Enrollment
  extends Model<EnrollmentAttributes, EnrollmentCreationAttributes>
  implements EnrollmentAttributes
{
  public id!: number;
  public teacherId!: number;
  public subjectId!: number;
  public studentId!: number;
  public classId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Enrollment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "teachers",
        key: "id",
      },
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "subjects",
        key: "id",
      },
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "students",
        key: "id",
      },
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "classes",
        key: "id",
      },
    },
  },
  {
    sequelize,
    tableName: "enrollments",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["teacherId", "subjectId", "studentId", "classId"],
        name: "unique_enrollment",
      },
    ],
  }
);

export default Enrollment;
