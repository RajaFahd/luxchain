# DESIGN SYSTEM - LUXCHAIN

## 1. Visual Identity
Luxchain merupakan platform verifikasi fashion mewah berbasis blockchain yang mengedepankan kesan **premium, eksklusif, dan terpercaya**. Desain mengadopsi tema **Luxury Gold** dengan dukungan dual-mode (Light & Dark), menggunakan aksen emas sebagai warna utama yang mencerminkan kemewahan produk fashion yang diverifikasi.

## 2. Color Palette (Token-Based, Dual Mode)

Arsitektur warna menggunakan CSS Custom Properties (design tokens) dengan palette **gold accent** yang konsisten di kedua mode.

### Light Mode (Default — `:root`)
| Token                      | Value                          | Keterangan                       |
|----------------------------|--------------------------------|----------------------------------|
| `--background`             | `#faf8f4`                      | Latar utama (warm cream)         |
| `--foreground`             | `#2a2520`                      | Teks utama (dark brown)          |
| `--card`                   | `#ffffff`                      | Background kartu (white)         |
| `--card-foreground`        | `#2a2520`                      | Teks di atas kartu               |
| `--popover`                | `#ffffff`                      | Background popover/dropdown      |
| `--popover-foreground`     | `#2a2520`                      | Teks di popover                  |
| `--primary`                | `#b8963e`                      | **Warna aksi utama (GOLD)** ✨   |
| `--primary-foreground`     | `#ffffff`                      | Teks di atas primary (white)     |
| `--secondary`              | `#f0ebe0`                      | Warna sekunder (cream panel)     |
| `--secondary-foreground`   | `#2a2520`                      | Teks di atas secondary           |
| `--muted`                  | `#f0ebe0`                      | Area non-aktif (soft cream)      |
| `--muted-foreground`       | `#8a8078`                      | Teks non-aktif (warm grey)       |
| `--accent`                 | `#b8963e`                      | **Highlight/hover (GOLD)** ✨    |
| `--accent-foreground`      | `#ffffff`                      | Teks pada accent                 |
| `--destructive`            | `#d44040`                      | Aksi berbahaya (red)             |
| `--destructive-foreground` | `#ffffff`                      | Teks pada destructive            |
| `--border`                 | `rgba(180, 150, 90, 0.18)`     | Garis batas (gold transparan)    |
| `--input-background`       | `#f5f2ed`                      | Background input field           |
| `--switch-background`      | `#d6cfc4`                      | Background switch toggle         |
| `--ring`                   | `#b8963e`                      | **Focus ring (GOLD)** ✨         |

### Dark Mode (`.dark` class)
| Token                      | Value                          | Keterangan                       |
|----------------------------|--------------------------------|----------------------------------|
| `--background`             | `#0a0a0f`                      | Latar utama (deep dark)          |
| `--foreground`             | `#f0ede8`                      | Teks utama (warm white)          |
| `--card`                   | `#13131a`                      | Background kartu (dark elevated) |
| `--card-foreground`        | `#f0ede8`                      | Teks di atas kartu               |
| `--popover`                | `#13131a`                      | Background popover               |
| `--popover-foreground`     | `#f0ede8`                      | Teks di popover                  |
| `--primary`                | `#c8a96e`                      | **Warna aksi utama (GOLD)** ✨   |
| `--primary-foreground`     | `#0a0a0f`                      | Teks di atas primary (dark)      |
| `--secondary`              | `#1e1e2a`                      | Warna sekunder (dark panel)      |
| `--secondary-foreground`   | `#f0ede8`                      | Teks di atas secondary           |
| `--muted`                  | `#1a1a24`                      | Area non-aktif (muted dark)      |
| `--muted-foreground`       | `#7a7a96`                      | Teks non-aktif (grey-purple)     |
| `--accent`                 | `#c8a96e`                      | **Highlight/hover (GOLD)** ✨    |
| `--accent-foreground`      | `#0a0a0f`                      | Teks pada accent                 |
| `--destructive`            | `#e05c5c`                      | Aksi berbahaya (coral red)       |
| `--destructive-foreground` | `#ffffff`                      | Teks pada destructive            |
| `--border`                 | `rgba(200, 169, 110, 0.15)`    | Garis batas (gold transparan)    |
| `--input-background`       | `#1e1e2a`                      | Background input field           |
| `--switch-background`      | `#2e2e3a`                      | Background switch toggle         |
| `--ring`                   | `#c8a96e`                      | **Focus ring (GOLD)** ✨         |

### Sidebar Tokens
| Token                          | Light                        | Dark                           |
|--------------------------------|------------------------------|--------------------------------|
| `--sidebar`                    | `#f5f2ed`                    | `#0f0f18`                      |
| `--sidebar-foreground`         | `#2a2520`                    | `#f0ede8`                      |
| `--sidebar-primary`            | `#b8963e`                    | `#c8a96e`                      |
| `--sidebar-primary-foreground` | `#ffffff`                    | `#0a0a0f`                      |
| `--sidebar-accent`             | `#ede8de`                    | `#1e1e2a`                      |
| `--sidebar-accent-foreground`  | `#2a2520`                    | `#f0ede8`                      |
| `--sidebar-border`             | `rgba(180, 150, 90, 0.15)`   | `rgba(200, 169, 110, 0.15)`    |

### Chart Colors (Data Visualization)
| Token        | Light       | Dark        | Keterangan                    |
|--------------|-------------|-------------|-------------------------------|
| `--chart-1`  | `#b8963e`   | `#c8a96e`   | Gold (primary chart color)    |
| `--chart-2`  | `#7b5fc4`   | `#8b6fd4`   | Purple (secondary)            |
| `--chart-3`  | `#3a9e94`   | `#5bbfb5`   | Teal (tertiary)               |
| `--chart-4`  | `#c86a4f`   | `#e07a5f`   | Coral (quaternary)            |
| `--chart-5`  | `#6a9e84`   | `#81b29a`   | Sage green (quinary)          |

### Spacing & Radius
- `--radius`: `1rem` (16px)
- `--radius-sm`: `calc(var(--radius) - 4px)` → 12px
- `--radius-md`: `calc(var(--radius) - 2px)` → 14px
- `--radius-lg`: `var(--radius)` → 16px
- `--radius-xl`: `calc(var(--radius) + 4px)` → 20px

### Key Colors Quick Reference 🎨

**Light Mode:**
```
GOLD (Primary):     #b8963e  — Aksi utama, accent, ring, sidebar active
WARM CREAM (BG):    #faf8f4  — Background utama
WHITE (Card):       #ffffff  — Card, popover
CREAM PANEL:        #f0ebe0  — Secondary, muted areas
LIGHT CREAM:        #f5f2ed  — Input background, sidebar
DARK BROWN (Text):  #2a2520  — Teks utama
WARM GREY:          #8a8078  — Teks non-aktif
RED:                #d44040  — Destructive/error
```

**Dark Mode:**
```
GOLD (Primary):     #c8a96e  — Aksi utama, accent, ring, sidebar active
DEEP DARK (BG):     #0a0a0f  — Background utama
DARK ELEVATED:      #13131a  — Card, popover
DARK PANEL:         #1e1e2a  — Secondary, input background
MUTED DARK:         #1a1a24  — Muted areas
WARM WHITE (Text):  #f0ede8  — Teks utama
GREY PURPLE:        #7a7a96  — Teks non-aktif
CORAL RED:          #e05c5c  — Destructive/error
```

## 3. Typography
Inter dan Roboto Mono dipilih guna memperkuat estetika teknis-luxury.
- **Headings**: Inter (weight `500`) - Memberikan kesan kokoh dan modern.
- **Body Text**: Inter (weight `400`) - Menjamin tingkat keterbacaan yang tinggi.
- **Monospace**: Roboto Mono - Digunakan untuk menampilkan wallet address, Tx Hash, dan UUID.
- **Font Size Base**: `16px`

## 4. UI Components (Flutter & Web)
- **Buttons**: Menggunakan `border-radius: var(--radius-md)` (14px) dengan gold accent pada hover/active state.
- **Cards**: Background `var(--card)` dengan border `var(--border)` (gold transparan) dan shadow minimal.
- **Inputs**: Background `var(--input-background)`, focus ring menggunakan `var(--ring)` (gold).
- **Sidebar**: Background `var(--sidebar)` dengan navigasi aktif menggunakan gold `var(--sidebar-primary)`.
- **Badges/Status**: Menggunakan varian `secondary`, `destructive`, dan `outline` dengan gold accent.
- **Scanner View**: Viewport kamera dengan overlay garis pemindai gold yang beranimasi.

## 5. Implementasi CSS
Semua token diimplementasikan via CSS Custom Properties di `:root` (light mode) dan `.dark` class (dark mode). TailwindCSS v4 mengaksesnya melalui `@theme inline` mapping. Kedua mode menggunakan gold sebagai aksen utama dengan intensitas yang disesuaikan untuk kontras optimal.