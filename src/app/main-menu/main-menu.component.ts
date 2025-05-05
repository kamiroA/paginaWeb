import { Component } from '@angular/core';

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
  imports: [],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.css'
})
export class MainMenuComponent {

}
