import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { FirebaseService } from '../services/firebase.service';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserModel } from '../models/user.model';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly firebaseService: FirebaseService,
    @InjectModel(User.name) private readonly userModel: UserModel
  ) {}

  @Post('signup')
  async signup(@Body() { email, password, confirmPassword }: { email: string; password: string; confirmPassword: string }) {
    try {
      // Validate password confirmation
      if (password !== confirmPassword) {
        throw new HttpException('Passwords do not match', HttpStatus.BAD_REQUEST);
      }

      // Validate password strength
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
      if (!passwordRegex.test(password)) {
        throw new HttpException('Password must be at least 6 characters long and contain at least one uppercase letter, one number, and one special character', HttpStatus.BAD_REQUEST);
      }

      const saltOrRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltOrRounds);

      const userRecord = await this.firebaseService.getAuth().createUser({
        email,
        password,
      });

      const newUser = new this.userModel({
        id: userRecord.uid,
        email,
        password: passwordHash,
      });
      await newUser.save();

      return { message: 'User registered successfully', userId: userRecord.uid };
    } catch (error) {
      // Handle Firebase errors gracefully
      if (error.code === 'auth/email-already-exists') {
        throw new HttpException('Email already in use', HttpStatus.BAD_REQUEST);
      } else {
        console.error('Error during signup:', error);
        throw new HttpException('Signup failed', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Post('login')
  async login(@Body() { email, password }: { email: string; password: string }) {
    try {
      const user = await this.userModel.findOne({email});
      if (!user){
        throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED); 
      }


      const expiresIn = 3600;
      const idToken = await this.firebaseService.getAuth().createCustomToken(user.id, {expiresIn});

       

      console.log('hopty hopty');

      // You can return a success message or any other relevant data here
      return { message: 'Login successful!', userId: user.id, token: idToken };

    } catch (error) { console.error('Error during login:', error);
      if (error.codePrefix === 'auth') {
        throw error; 
      } else {
        throw new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR); 
      }
    }
  }
}