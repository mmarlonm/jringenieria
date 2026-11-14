import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CatalogosSgc } from '../../quotes-products.types';

@Component({
  selector: 'app-alcance-sgc',
  templateUrl: './alcance-sgc.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
  ],
})
export class AlcanceSgcComponent {
  @Input() formGroup!: FormGroup;
  @Input() catalogos: CatalogosSgc | null = null;

  isEntregableChecked(codigo: string): boolean {
    const list: string[] = this.formGroup?.get('entregables')?.value || [];
    return list.includes(codigo);
  }

  onEntregableChange(codigo: string, isChecked: boolean): void {
    const list: string[] = [...(this.formGroup?.get('entregables')?.value || [])];
    if (isChecked && !list.includes(codigo)) {
      list.push(codigo);
    } else if (!isChecked) {
      const idx = list.indexOf(codigo);
      if (idx >= 0) {
        list.splice(idx, 1);
      }
    }
    this.formGroup?.get('entregables')?.setValue(list);
    this.formGroup?.get('entregables')?.markAsDirty();
  }
}
