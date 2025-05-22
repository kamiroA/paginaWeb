import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinEventDialogComponent } from './join-event-dialog.component';

describe('JoinEventDialogComponent', () => {
  let component: JoinEventDialogComponent;
  let fixture: ComponentFixture<JoinEventDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinEventDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinEventDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
