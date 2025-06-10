import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CubeLoaderComponent } from './cube-loader.component';

describe('CubeLoaderComponent', () => {
  let component: CubeLoaderComponent;
  let fixture: ComponentFixture<CubeLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CubeLoaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CubeLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
