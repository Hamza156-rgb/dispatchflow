// routes/auth.ts
import { Router } from 'express';
import { register, login, forgotPassword, getMe } from '../controllers/auth';
import { authenticate } from '../middleware/errorHandler';

export const authRouter = Router();
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/forgot-password', forgotPassword);
authRouter.get('/me', authenticate, getMe);
