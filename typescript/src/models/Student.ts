import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface StudentAttributes {
  id: number;
  email: string;
  name: string;
}

interface StudentCreationAttributes extends Optional<StudentAttributes, 'id'> {}

class Student extends Model<StudentAttributes, StudentCreationAttributes> 
  implements StudentAttributes {
  public id!: number;
  public email!: string;
  public name!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Student.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'students',
    timestamps: true,
  }
);

export default Student;

