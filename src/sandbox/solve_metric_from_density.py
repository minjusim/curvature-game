"""
Solve a game-like metric from source density.

This is the practical route for the current game:

    source density rho(x, y)
        -> weak-field Einstein equation
        -> Poisson equation: laplacian(Phi) = 4 pi G_eff rho
        -> metric:
             ds^2 = -(1 + 2 Phi) dt^2
                    + (1 - 2 Phi)(dx^2 + dy^2 + dz^2)
        -> slow geodesic acceleration ~= -grad(Phi)

That is not a full nonlinear numerical-relativity solver. It is the standard
static weak-field limit of Einstein's field equation, adapted to a 2D game
board while keeping a 4D spacetime metric.
"""

from functools import lru_cache
from math import pi
import os
from pathlib import Path

MPL_CACHE_DIR = Path("/private/tmp/einstein_metric_mpl_cache")
MPL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPL_CACHE_DIR))
os.environ.setdefault("XDG_CACHE_HOME", str(MPL_CACHE_DIR))

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from scipy.interpolate import RegularGridInterpolator
from scipy.sparse import diags, eye, kron
from scipy.sparse.linalg import spsolve


DIM = 4
EXTENT = 7.5
GRID_N = 121
G_EFF = 0.0025
SOURCE_SIGMA = 0.42
HEIGHT_VISUAL_SCALE = 85.0
LAMBDA = 0.0

# Use a finite-difference step near the grid spacing. This avoids asking the
# linear interpolator for sub-grid curvature it cannot actually know.
FD_STEPS_IN_GRID_CELLS = 1.0

MASSES = (
    {"x": -2.0, "y": 0.8, "mass": 4.2},
    {"x": 0.6, "y": -0.4, "mass": 7.8},
    {"x": 2.6, "y": 2.1, "mass": 2.8},
)


def make_grid():
    xs = np.linspace(-EXTENT, EXTENT, GRID_N)
    ys = np.linspace(-EXTENT, EXTENT, GRID_N)
    dx = xs[1] - xs[0]
    x_grid, y_grid = np.meshgrid(xs, ys, indexing="xy")
    return xs, ys, dx, x_grid, y_grid


def make_density(x_grid, y_grid):
    """Gaussian source density; each source integrates approximately to mass."""
    density = np.zeros_like(x_grid)
    norm = 1.0 / (2.0 * pi * SOURCE_SIGMA * SOURCE_SIGMA)

    for source in MASSES:
        dx = x_grid - source["x"]
        dy = y_grid - source["y"]
        density += source["mass"] * norm * np.exp(-(dx * dx + dy * dy) / (2.0 * SOURCE_SIGMA * SOURCE_SIGMA))

    return density


def solve_poisson_dirichlet(source, dx):
    """
    Solve laplacian(Phi) = source with Phi = 0 at the boundary.

    The 5-point Laplacian matrix is negative definite under this convention, so
    a positive density produces a negative gravitational potential inside.
    """
    interior_n = GRID_N - 2
    main = -2.0 * np.ones(interior_n)
    off = np.ones(interior_n - 1)
    lap_1d = diags((off, main, off), (-1, 0, 1), shape=(interior_n, interior_n)) / (dx * dx)
    ident = eye(interior_n, format="csr")
    lap_2d = kron(ident, lap_1d) + kron(lap_1d, ident)

    rhs = source[1:-1, 1:-1].reshape(-1)
    phi_inner = spsolve(lap_2d.tocsr(), rhs).reshape((interior_n, interior_n))

    phi = np.zeros_like(source)
    phi[1:-1, 1:-1] = phi_inner
    return phi


def laplacian_5pt(values, dx):
    out = np.zeros_like(values)
    out[1:-1, 1:-1] = (
        values[1:-1, 2:]
        + values[1:-1, :-2]
        + values[2:, 1:-1]
        + values[:-2, 1:-1]
        - 4.0 * values[1:-1, 1:-1]
    ) / (dx * dx)
    return out


def make_interpolator(xs, ys, values):
    return RegularGridInterpolator((ys, xs), values, bounds_error=False, fill_value=None)


class WeakFieldMetric:
    def __init__(self, xs, ys, dx, phi_grid, density_grid):
        self.xs = xs
        self.ys = ys
        self.dx = dx
        self.fd_h = FD_STEPS_IN_GRID_CELLS * dx
        self.phi_interp = make_interpolator(xs, ys, phi_grid)
        self.density_interp = make_interpolator(xs, ys, density_grid)

    @staticmethod
    def shifted(point, axis, delta):
        values = list(point)
        values[axis] += delta
        return tuple(values)

    @lru_cache(maxsize=None)
    def phi(self, point):
        _, x, y, _ = point
        return float(self.phi_interp((y, x)))

    @lru_cache(maxsize=None)
    def density(self, point):
        _, x, y, _ = point
        return float(self.density_interp((y, x)))

    def metric_component(self, point, mu, nu):
        if mu != nu:
            return 0.0

        potential = self.phi(point)
        if mu == 0:
            return -(1.0 + 2.0 * potential)
        return 1.0 - 2.0 * potential

    def inverse_metric_component(self, point, mu, nu):
        if mu != nu:
            return 0.0
        return 1.0 / self.metric_component(point, mu, mu)

    def partial_metric(self, point, axis, mu, nu):
        if axis in (0, 3) or mu != nu:
            return 0.0

        plus = self.shifted(point, axis, self.fd_h)
        minus = self.shifted(point, axis, -self.fd_h)
        return (self.metric_component(plus, mu, nu) - self.metric_component(minus, mu, nu)) / (2.0 * self.fd_h)

    @lru_cache(maxsize=None)
    def gamma(self, point, rho, mu, nu):
        total = 0.0
        for sigma in range(DIM):
            inv = self.inverse_metric_component(point, rho, sigma)
            if inv == 0.0:
                continue
            total += inv * (
                self.partial_metric(point, mu, sigma, nu)
                + self.partial_metric(point, nu, sigma, mu)
                - self.partial_metric(point, sigma, mu, nu)
            )
        return 0.5 * total

    def partial_gamma(self, point, axis, rho, mu, nu):
        if axis in (0, 3):
            return 0.0

        plus = self.shifted(point, axis, self.fd_h)
        minus = self.shifted(point, axis, -self.fd_h)
        return (self.gamma(plus, rho, mu, nu) - self.gamma(minus, rho, mu, nu)) / (2.0 * self.fd_h)

    def ricci_tensor(self, point):
        tensor = [[0.0 for _ in range(DIM)] for _ in range(DIM)]

        for mu in range(DIM):
            for nu in range(DIM):
                derivative_terms = 0.0
                for rho in range(DIM):
                    derivative_terms += self.partial_gamma(point, rho, rho, mu, nu)
                    derivative_terms -= self.partial_gamma(point, nu, rho, mu, rho)

                quadratic_terms = 0.0
                for rho in range(DIM):
                    for sigma in range(DIM):
                        quadratic_terms += self.gamma(point, rho, mu, nu) * self.gamma(point, sigma, rho, sigma)
                        quadratic_terms -= self.gamma(point, sigma, mu, rho) * self.gamma(point, rho, nu, sigma)

                tensor[mu][nu] = derivative_terms + quadratic_terms

        return tensor

    def ricci_scalar(self, point, ricci):
        scalar = 0.0
        for mu in range(DIM):
            for nu in range(DIM):
                scalar += self.inverse_metric_component(point, mu, nu) * ricci[mu][nu]
        return scalar

    def einstein_tensor(self, point):
        ricci = self.ricci_tensor(point)
        scalar = self.ricci_scalar(point, ricci)
        tensor = [[0.0 for _ in range(DIM)] for _ in range(DIM)]

        for mu in range(DIM):
            for nu in range(DIM):
                tensor[mu][nu] = ricci[mu][nu] - 0.5 * scalar * self.metric_component(point, mu, nu)

        return tensor, ricci, scalar

    def effective_stress_energy(self, point, einstein):
        tensor = [[0.0 for _ in range(DIM)] for _ in range(DIM)]
        for mu in range(DIM):
            for nu in range(DIM):
                left_side = einstein[mu][nu] + LAMBDA * self.metric_component(point, mu, nu)
                tensor[mu][nu] = left_side / (8.0 * pi)
        return tensor

    def grad_phi(self, point):
        gradients = []
        for axis in (1, 2):
            plus = self.shifted(point, axis, self.fd_h)
            minus = self.shifted(point, axis, -self.fd_h)
            gradients.append((self.phi(plus) - self.phi(minus)) / (2.0 * self.fd_h))
        return tuple(gradients)

    def slow_geodesic_accel(self, point):
        return (-self.gamma(point, 1, 0, 0), -self.gamma(point, 2, 0, 0))


def format_matrix(matrix):
    return "\n".join("[" + ", ".join(f"{value: .6e}" for value in row) + "]" for row in matrix)


def save_plot(xs, ys, density, phi, acceleration_x, acceleration_y, effective_t00):
    fig, axes = plt.subplots(2, 2, figsize=(11, 9), constrained_layout=True)
    extent = [xs[0], xs[-1], ys[0], ys[-1]]

    images = (
        (axes[0, 0], density, "source density rho(x, y)", "magma"),
        (axes[0, 1], phi, "solved potential Phi", "viridis"),
        (axes[1, 0], HEIGHT_VISUAL_SCALE * phi, "game height proxy", "coolwarm"),
        (axes[1, 1], effective_t00, "linear EFE T00 = G00 / 8pi", "magma"),
    )

    for ax, values, title, cmap in images:
        im = ax.imshow(values, extent=extent, origin="lower", cmap=cmap)
        ax.set_title(title)
        ax.set_xlabel("x")
        ax.set_ylabel("y")
        fig.colorbar(im, ax=ax, shrink=0.82)

    stride = 8
    axes[0, 1].quiver(
        xs[::stride],
        ys[::stride],
        acceleration_x[::stride, ::stride],
        acceleration_y[::stride, ::stride],
        color="white",
        alpha=0.68,
        scale=1.6,
        width=0.003,
    )

    output = Path(__file__).resolve().parents[1] / "assets" / "images" / "weak_field_metric_from_density.png"
    fig.savefig(output, dpi=160)
    plt.close(fig)
    return output


def main():
    xs, ys, dx, x_grid, y_grid = make_grid()
    density = make_density(x_grid, y_grid)
    source = 4.0 * pi * G_EFF * density
    phi_grid = solve_poisson_dirichlet(source, dx)

    dphi_dy, dphi_dx = np.gradient(phi_grid, dx, dx)
    acceleration_x = -dphi_dx
    acceleration_y = -dphi_dy

    lap_phi = laplacian_5pt(phi_grid, dx)
    poisson_residual = lap_phi[1:-1, 1:-1] - source[1:-1, 1:-1]

    # Linearized weak-field identity: G_00 ~= 2 laplacian(Phi).
    g00_linear = 2.0 * lap_phi
    effective_t00_linear = g00_linear / (8.0 * pi)

    metric = WeakFieldMetric(xs, ys, dx, phi_grid, density)
    samples = (
        ("launch-ish point", (0.0, -5.9, -2.9, 0.0)),
        ("near central source", (0.0, 0.1, -0.1, 0.0)),
        ("target-ish point", (0.0, 6.1, -2.7, 0.0)),
    )

    plot_path = save_plot(xs, ys, density, phi_grid, acceleration_x, acceleration_y, effective_t00_linear)

    print("Solved weak-field metric from source density.")
    print(f"grid:                 {GRID_N} x {GRID_N}")
    print(f"domain:               [{-EXTENT}, {EXTENT}] x [{-EXTENT}, {EXTENT}]")
    print(f"G_eff:                {G_EFF}")
    print(f"integrated mass:      {density.sum() * dx * dx: .6e}")
    print(f"Phi range:            [{phi_grid.min(): .6e}, {phi_grid.max(): .6e}]")
    print(f"max |Poisson error|:  {np.max(np.abs(poisson_residual)): .6e}")
    print(f"plot:                 {plot_path}")

    for label, point in samples:
        einstein, _, scalar = metric.einstein_tensor(point)
        stress_energy = metric.effective_stress_energy(point, einstein)
        dphidx, dphidy = metric.grad_phi(point)
        ax, ay = metric.slow_geodesic_accel(point)
        expected_t00 = G_EFF * metric.density(point)

        print(f"\n=== {label} at x={point[1]:.2f}, y={point[2]:.2f} ===")
        print(f"rho:                       {metric.density(point): .6e}")
        print(f"Phi:                       {metric.phi(point): .6e}")
        print(f"height proxy:              {HEIGHT_VISUAL_SCALE * metric.phi(point): .6e}")
        print(f"g_00:                      {metric.metric_component(point, 0, 0): .6e}")
        print(f"Ricci scalar R:            {scalar: .6e}")
        print(f"full finite-diff T_00:     {stress_energy[0][0]: .6e}")
        print(f"weak-field expected T_00:  {expected_t00: .6e}")
        print(f"-grad(Phi):                ({-dphidx: .6e}, {-dphidy: .6e})")
        print(f"-Gamma^i_00 accel:         ({ax: .6e}, {ay: .6e})")
        print("Einstein tensor G_mu_nu:")
        print(format_matrix(einstein))


if __name__ == "__main__":
    main()
