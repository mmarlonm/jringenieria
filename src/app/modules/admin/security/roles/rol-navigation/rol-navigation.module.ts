import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleNavigationComponent } from './rol-navigation.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

@NgModule({
    declarations: [RoleNavigationComponent],
    imports: [CommonModule, MatCheckboxModule, MatIconModule, MatListModule],
    exports: [RoleNavigationComponent], // Asegúrate de exportarlo
})
export class RoleNavigationModule {}