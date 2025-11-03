import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SubjectAttributes {
  id: number;
  code: string;
  name: string;
}

interface SubjectCreationAttributes extends Optional<SubjectAttributes, 'id'> {}

class Subject extends Model<SubjectAttributes, SubjectCreationAttributes> 
  implements SubjectAttributes {
  public id!: number;
  public code!: string;
  public name!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Subject.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'subjects',
    timestamps: true,
  }
);

export default Subject;

