import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CatalogosSgc } from '../../quotes-products.types';

@Component({
  selector: 'app-condiciones-sgc',
  templateUrl: './condiciones-sgc.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
})
export class CondicionesSgcComponent {
  @Input() form!: FormGroup;
  @Input() catalogos: CatalogosSgc | null = null;
}
