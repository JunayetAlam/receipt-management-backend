import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import cookieParser from 'cookie-parser';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './app/routes';
import path from 'path';
import { html } from './htmldesign';
import { firebaseLoginHtml } from './firebase-login.html';
import config from './config';

const app: Application = express();

app.use(
  cors({
    origin: [config.base_url_client || 'http://localhost:3000'],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(cookieParser());

app.get('/', (req: Request, res: Response) => {
  res.send(html(config.project_name || 'Server'));
});

app.get('/firebase-login', (req: Request, res: Response) => {
  res.send(firebaseLoginHtml);
});

app.use('/api/v1', router);

// Static asset serving for device storage
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));
app.use('/upload', express.static(path.join(__dirname, 'app', 'upload')));

app.use(globalErrorHandler);
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'API NOT FOUND!',
    error: {
      path: req.originalUrl,
      message: 'Your requested path is not found!',
    },
  });
});

export default app;
