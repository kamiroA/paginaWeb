import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateEventDialogComponent } from './update-event-dialog.component';

describe('UpdateEventDialogComponent', () => {
  let component: UpdateEventDialogComponent;
  let fixture: ComponentFixture<UpdateEventDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateEventDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateEventDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
