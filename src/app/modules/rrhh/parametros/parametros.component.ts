import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';
import { Parametro } from '../colaboradores/colaboradores.types';
import { mensajeError } from '../colaboradores/colaboradores.utils';

interface FilaParametro {
    parametro: Parametro;
    control: FormControl<string>;
    guardando: boolean;
}

/** Parámetros de RRHH (tablas LFT, umbrales y ventanas de alerta). Cada fila se guarda por separado. */
@Component({
    selector: 'rrhh-parametros',
    standalone: true,
    templateUrl: './parametros.component.html',
    imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule]
})
export class ParametrosComponent implements OnInit {
    private readonly _service = inject(ColaboradoresService);
    private readonly _snackBar = inject(MatSnackBar);

    filas: FilaParametro[] = [];
    cargando = true;

    ngOnInit(): void {
        this._service.listarParametros().subscribe({
            next: (lista) => {
                this.filas = lista.map((p) => ({ parametro: p, control: new FormControl(p.valor, { nonNullable: true }), guardando: false }));
                this.cargando = false;
            },
            error: (e) => {
                this.cargando = false;
                this.avisar(mensajeError(e, 'No se pudieron cargar los parámetros.'));
            }
        });
    }

    guardar(fila: FilaParametro): void {
        fila.guardando = true;
        this._service.actualizarParametro(fila.parametro.clave, fila.control.value).subscribe({
            next: (actualizado) => {
                fila.guardando = false;
                fila.parametro = actualizado;
                fila.control.reset(actualizado.valor); // el API devuelve el valor normalizado (p. ej. «30,15,3»)
                this.avisar(`Parámetro ${actualizado.clave} guardado.`);
            },
            error: (e) => {
                fila.guardando = false;
                this.avisar(mensajeError(e, 'No se pudo guardar el parámetro.'));
            }
        });
    }

    private avisar(texto: string): void {
        this._snackBar.open(texto, 'Cerrar', { duration: 5000 });
    }
}
