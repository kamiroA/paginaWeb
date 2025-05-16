import { Component } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  infoMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private auth: Auth, 
    private router: Router, 
    private fb: FormBuilder
  ) {
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  get emailControl() {
    return this.loginForm.get('email');
  }
  get passwordControl() {
    return this.loginForm.get('password');
  }

  async login(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.errorMessage = '';
    this.infoMessage = '';
    this.isLoading = true;
    try {
      await signInWithEmailAndPassword(
        this.auth,
        this.emailControl?.value,
        this.passwordControl?.value
      );
      this.router.navigate(['/menu']);
    } catch (error: any) {
      this.errorMessage = 'Credenciales incorrectas.';
      console.warn('Error en login:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.errorMessage = '';
    this.infoMessage = '';
    this.isLoading = true;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
      this.router.navigate(['/menu']);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.warn('Popup de Google cerrado por el usuario.');
      } else {
        this.errorMessage = 'Error en login con Google.';
      }
      console.warn('Error en loginWithGoogle:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async resetPassword(): Promise<void> {
    this.errorMessage = '';
    this.infoMessage = '';
    const email = this.emailControl?.value;
    if (!email) {
      this.errorMessage = 'Ingresa tu email para restablecer.';
      return;
    }
    this.isLoading = true;
    try {
      await sendPasswordResetEmail(this.auth, email);
      this.infoMessage = 'Correo enviado.';
    } catch (error: any) {
      this.errorMessage = 'No se pudo enviar el correo.';
      console.warn('Error en resetPassword:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
