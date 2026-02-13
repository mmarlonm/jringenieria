import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleNavigationComponent } from './rol-navigation.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

@NgModule({
    // ❌ ERROR ANTERIOR: declarations: [RoleNavigationComponent],
    // Los componentes standalone NO van en declarations.
    declarations: [],

    imports: [
        CommonModule,
        MatCheckboxModule,
        MatIconModule,
        MatListModule,
        RoleNavigationComponent // ✅ CORRECCIÓN: Se importa aquí como si fuera un módulo
    ],

    exports: [
        RoleNavigationComponent // Se exporta para que otros lo usen
    ],
})
export class RoleNavigationModule { }