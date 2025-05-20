// src/main.ts
import '@angular/compiler'; // Importa el compilador JIT para estar disponible en tiempo de ejecución
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
