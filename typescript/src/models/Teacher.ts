import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TeacherAttributes {
  id: number;
  email: string;
  name: string;
}

interface TeacherCreationAttributes extends Optional<TeacherAttributes, 'id'> {}

class Teacher extends Model<TeacherAttributes, TeacherCreationAttributes> 
  implements TeacherAttributes {
  public id!: number;
  public email!: string;
  public name!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Teacher.init(
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
    tableName: 'teachers',
    timestamps: true,
  }
);

export default Teacher;

