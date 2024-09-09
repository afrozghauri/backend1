// src/models/user.model.ts
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

export { User }; // Export the User class

export type UserModel = Model<UserDocument>;