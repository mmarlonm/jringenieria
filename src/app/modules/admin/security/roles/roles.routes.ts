import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    Routes,
} from '@angular/router';
import { RolesComponent } from 'app/modules/admin/security/roles/roles.component';
import { RolService } from 'app/modules/admin/security/roles/roles.service';
import { RolesDetailsComponent } from 'app/modules/admin/security/roles/details/roles-detail.component';
import { RolesListComponent } from 'app/modules/admin/security/roles/list/roles-list.component';
import { catchError, throwError } from 'rxjs';

/**
 * Contact resolver
 *
 * @param route
 * @param state
 */
const contactResolver = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const rolesService = inject(RolService);
    const router = inject(Router);

    return rolesService.getUserById(route.paramMap.get('id')).pipe(
        // Error here means the requested contact is not available
        catchError((error) => {
            // Log the error
            console.error(error);

            // Get the parent url
            const parentUrl = state.url.split('/').slice(0, -1).join('/');

            // Navigate to there
            router.navigateByUrl(parentUrl);

            // Throw an error
            return throwError(error);
        })
    );
};

/**
 * Antes de salir del rol abierto (a otro rol, a la lista o a otra pantalla) avisa si hay cambios sin guardar.
 */
const puedeSalirDelRol = (component: RolesDetailsComponent) => component.puedeSalir();

export default [
    {
        path: '',
        component: RolesComponent,
        children: [
            {
                path: '',
                component: RolesListComponent,
                resolve: {
                    roles: () => inject(RolService).getRoles()
                },
                children: [
                    {
                        path: ':id',
                        component: RolesDetailsComponent,
                        resolve: {
                            rol: contactResolver
                        },
                        canDeactivate: [puedeSalirDelRol],
                    },
                ],
            },
        ],
    },
] as Routes;
