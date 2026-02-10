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
 * Can deactivate contacts details
 *
 * @param component
 * @param currentRoute
 * @param currentState
 * @param nextState
 */
const canDeactivateContactsDetails = (
    component: RolesDetailsComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState: RouterStateSnapshot
) => {
    // Get the next route
    let nextRoute: ActivatedRouteSnapshot = nextState.root;
    while (nextRoute.firstChild) {
        nextRoute = nextRoute.firstChild;
    }

    // If the next state doesn't contain '/contacts'
    // it means we are navigating away from the
    // contacts app
    if (!nextState.url.includes('/roles')) {
        // Let it navigate
        return true;
    }

    // If we are navigating to another contact...
    if (nextRoute.paramMap.get('id')) {
        // Just navigate
        return true;
    }

    // Otherwise, close the drawer first, and then navigate
    return component.closeDrawer().then(() => true);
};

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
                        canDeactivate: [canDeactivateContactsDetails],
                    },
                ],
            },
        ],
    },
] as Routes;
