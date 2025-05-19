import { Component } from '@angular/core';
import { NavbarComponent } from "../navbar/navbar.component";
import { CalendarioComponent } from '../calendario/calendario.component';

@Component({
  selector: 'app-main-menu',
  standalone: true,
  template: `
    <div class="main-menu">
      <h1>Menú Principal</h1>
      <p>Bienvenido al menú principal. Aquí podrás navegar a otras secciones.</p>
      <!-- Más componentes o enlaces se pueden ir cargando aquí en el futuro -->
    </div>
  `,
  imports: [NavbarComponent, CalendarioComponent],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.css'
})
export class MainMenuComponent {

}
