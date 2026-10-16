import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ColaboradoresService } from '../colaboradores.service';
import { ResultadoImportacion, UsuarioDisponible } from '../colaboradores.types';
import { mensajeError } from '../colaboradores.utils';

/**
 * Elige qué usuarios del sistema pasan a ser colaboradores (todos vienen marcados; se desmarcan cuentas que no son personal).
 * La lista de candidatos la consulta quien abre el diálogo y la recibe como `data`: así no se dispara una petición HTTP
 * durante la detección de cambios al crearlo (la barra de carga de Fuse lanzaba NG0100 en modo desarrollo).
 */
@Component({
    selector: 'rrhh-importar-usuarios-dialog',
    standalone: true,
    templateUrl: './importar-usuarios-dialog.component.html',
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatCheckboxModule]
})
export class ImportarUsuariosDialogComponent {
    private readonly _service = inject(ColaboradoresService);
    private readonly _dialogRef = inject<MatDialogRef<ImportarUsuariosDialogComponent, ResultadoImportacion>>(MatDialogRef);
    private readonly _snackBar = inject(MatSnackBar);

    readonly usuarios = inject<UsuarioDisponible[]>(MAT_DIALOG_DATA);
    seleccionados = new Set<number>(this.usuarios.map((u) => u.usuarioId));
    importando = false;

    get todosMarcados(): boolean {
        return this.usuarios.length > 0 && this.seleccionados.size === this.usuarios.length;
    }

    get algunoMarcado(): boolean {
        return this.seleccionados.size > 0 && !this.todosMarcados;
    }

    alternarTodos(marcado: boolean): void {
        this.seleccionados = marcado ? new Set(this.usuarios.map((u) => u.usuarioId)) : new Set<number>();
    }

    alternar(usuarioId: number, marcado: boolean): void {
        const nuevo = new Set(this.seleccionados);
        if (marcado) nuevo.add(usuarioId);
        else nuevo.delete(usuarioId);
        this.seleccionados = nuevo;
    }

    importar(): void {
        if (this.seleccionados.size === 0 || this.importando) return;
        this.importando = true;
        this._service.importarUsuarios([...this.seleccionados]).subscribe({
            next: (resultado) => this._dialogRef.close(resultado),
            error: (e) => {
                this.importando = false;
                this._snackBar.open(mensajeError(e, 'No se pudo importar a los usuarios.'), 'Cerrar', { duration: 5000 });
            }
        });
    }
}
