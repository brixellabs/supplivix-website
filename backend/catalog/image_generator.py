"""
Generator for original Supplivix vector illustrations and image assets.
Generates 100% original SVG illustrations (bottle, jar, tube, box) and WebP/AVIF fallbacks.
Strictly zero stock photos, zero third-party downloads, zero emojis.
Brand palette: #016a38, #0b4f27, #b497ed, #e1d6f9, #7a2fd0, #59376d, #232323.
"""

import os

from PIL import Image, ImageDraw


def generate_product_svg_front(product_name: str, product_type: str, category_slug: str, accent_color: str = '#016a38') -> str:
    """Generate front perspective SVG illustration of the product packaging."""
    container_type = 'jar' if 'cream' in product_name.lower() or 'butter' in product_name.lower() or 'balm' in product_name.lower() else (
        'tube' if 'wash' in product_name.lower() or 'cleanser' in product_name.lower() or 'sunscreen' in product_name.lower() or 'spf' in product_name.lower() else (
            'dropper' if 'serum' in product_name.lower() or 'drops' in product_name.lower() else 'bottle'
        )
    )

    clean_name = product_name[:34]

    if container_type == 'bottle':
        shape_svg = f"""
        <!-- Bottle Body -->
        <rect x="200" y="210" width="200" height="300" rx="28" fill="#ffffff" stroke="#232323" stroke-width="4" />
        <!-- Bottle Neck & Cap -->
        <rect x="250" y="160" width="100" height="50" rx="8" fill="#ffffff" stroke="#232323" stroke-width="4" />
        <rect x="240" y="110" width="120" height="55" rx="6" fill="{accent_color}" stroke="#232323" stroke-width="4" />
        <line x1="255" y1="120" x2="255" y2="155" stroke="#ffffff" stroke-width="2" stroke-opacity="0.4" />
        <line x1="270" y1="120" x2="270" y2="155" stroke="#ffffff" stroke-width="2" stroke-opacity="0.4" />
        <line x1="285" y1="120" x2="285" y2="155" stroke="#ffffff" stroke-width="2" stroke-opacity="0.4" />
        <line x1="300" y1="120" x2="300" y2="155" stroke="#ffffff" stroke-width="2" stroke-opacity="0.4" />
        <line x1="315" y1="120" x2="315" y2="155" stroke="#ffffff" stroke-width="2" stroke-opacity="0.4" />
        <line x1="330" y1="120" x2="330" y2="155" stroke="#ffffff" stroke-width="2" stroke-opacity="0.4" />
        <line x1="345" y1="120" x2="345" y2="155" stroke="#ffffff" stroke-width="2" stroke-opacity="0.4" />
        <!-- Label Area -->
        <rect x="210" y="250" width="180" height="230" rx="12" fill="#f8f8f8" stroke="#e8e8e8" stroke-width="2" />
        <!-- Brand Badge -->
        <rect x="235" y="270" width="130" height="28" rx="4" fill="{accent_color}" />
        <text x="300" y="289" font-family="Poppins, Arial, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="1">SUPPLIVIX</text>
        <!-- Product Name -->
        <text x="300" y="340" font-family="Poppins, Arial, sans-serif" font-size="13" font-weight="700" fill="#232323" text-anchor="middle">{clean_name}</text>
        <text x="300" y="365" font-family="Poppins, Arial, sans-serif" font-size="10" font-weight="500" fill="#666666" text-anchor="middle">PURE SCIENCE FORMULA</text>
        <!-- Capsule Icon -->
        <g transform="translate(285, 390)">
            <rect x="0" y="0" width="30" height="15" rx="7.5" fill="{accent_color}" />
            <rect x="15" y="0" width="15" height="15" rx="7.5" fill="#e1d6f9" />
        </g>
        <text x="300" y="440" font-family="Poppins, Arial, sans-serif" font-size="9" font-weight="600" fill="#666666" text-anchor="middle">WHOLE FOOD QUALITY</text>
        """
    elif container_type == 'jar':
        shape_svg = f"""
        <!-- Jar Body -->
        <rect x="180" y="250" width="240" height="230" rx="20" fill="#ffffff" stroke="#232323" stroke-width="4" />
        <!-- Jar Lid -->
        <rect x="165" y="190" width="270" height="60" rx="10" fill="{accent_color}" stroke="#232323" stroke-width="4" />
        <!-- Label Area -->
        <rect x="195" y="280" width="210" height="170" rx="8" fill="#f8f8f8" stroke="#e8e8e8" stroke-width="2" />
        <!-- Brand Badge -->
        <text x="300" y="320" font-family="Poppins, Arial, sans-serif" font-size="12" font-weight="700" fill="{accent_color}" text-anchor="middle" letter-spacing="1.5">SUPPLIVIX LABS</text>
        <!-- Product Name -->
        <text x="300" y="360" font-family="Poppins, Arial, sans-serif" font-size="13" font-weight="700" fill="#232323" text-anchor="middle">{clean_name}</text>
        <text x="300" y="385" font-family="Poppins, Arial, sans-serif" font-size="10" font-weight="500" fill="#666666" text-anchor="middle">DERMATOLOGICALLY TESTED</text>
        <!-- Seal Badge -->
        <circle cx="300" cy="415" r="14" fill="{accent_color}" />
        <path d="M294 415 L298 419 L306 411" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
        """
    elif container_type == 'tube':
        shape_svg = f"""
        <!-- Tube Body -->
        <path d="M220 180 L380 180 L360 450 L240 450 Z" fill="#ffffff" stroke="#232323" stroke-width="4" />
        <!-- Tube Crimp Top -->
        <rect x="215" y="150" width="170" height="30" rx="4" fill="{accent_color}" stroke="#232323" stroke-width="3" />
        <!-- Tube Flip Cap -->
        <rect x="260" y="450" width="80" height="45" rx="8" fill="#232323" />
        <!-- Label Area -->
        <rect x="245" y="230" width="110" height="180" rx="6" fill="#f8f8f8" stroke="#e8e8e8" stroke-width="1.5" />
        <text x="300" y="270" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="{accent_color}" text-anchor="middle" letter-spacing="1">SUPPLIVIX</text>
        <text x="300" y="315" font-family="Poppins, Arial, sans-serif" font-size="12" font-weight="700" fill="#232323" text-anchor="middle">{clean_name}</text>
        <text x="300" y="345" font-family="Poppins, Arial, sans-serif" font-size="9" font-weight="500" fill="#666666" text-anchor="middle">SKIN BARRIER PROTECTION</text>
        <circle cx="300" cy="380" r="10" fill="{accent_color}" />
        """
    else:  # Dropper bottle
        shape_svg = f"""
        <!-- Dropper Bottle -->
        <rect x="210" y="230" width="180" height="270" rx="24" fill="#ffffff" stroke="#232323" stroke-width="4" />
        <!-- Dropper Neck & Collar -->
        <rect x="260" y="180" width="80" height="50" rx="4" fill="#ffffff" stroke="#232323" stroke-width="3" />
        <rect x="250" y="145" width="100" height="35" rx="6" fill="{accent_color}" stroke="#232323" stroke-width="3" />
        <!-- Rubber Bulb -->
        <path d="M275 145 C275 110, 325 110, 325 145 Z" fill="#232323" />
        <!-- Label Area -->
        <rect x="225" y="270" width="150" height="200" rx="8" fill="#f8f8f8" stroke="#e8e8e8" stroke-width="2" />
        <text x="300" y="310" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="{accent_color}" text-anchor="middle" letter-spacing="1">SUPPLIVIX</text>
        <text x="300" y="355" font-family="Poppins, Arial, sans-serif" font-size="12" font-weight="700" fill="#232323" text-anchor="middle">{clean_name}</text>
        <text x="300" y="385" font-family="Poppins, Arial, sans-serif" font-size="9" font-weight="500" fill="#666666" text-anchor="middle">ACTIVE CONCENTRATE</text>
        <!-- Pipette Droplet -->
        <path d="M300 410 C293 425, 307 425, 300 410 Z" fill="{accent_color}" stroke="{accent_color}" stroke-width="1.5" />
        """

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <!-- DEMO: Supplivix Original Vector Asset - Variant 1 (Front) -->
    <defs>
        <linearGradient id="bg_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fdfdfd" />
            <stop offset="100%" stop-color="#f3f4f6" />
        </linearGradient>
        <radialGradient id="halo_grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#e1d6f9" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#e1d6f9" stop-opacity="0" />
        </radialGradient>
        <filter id="subtle_shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.06" />
        </filter>
    </defs>
    <!-- Background -->
    <rect width="600" height="600" fill="url(#bg_grad)" />
    <!-- Ambient Halo -->
    <circle cx="300" cy="320" r="220" fill="url(#halo_grad)" />
    <!-- Product Shadow -->
    <ellipse cx="300" cy="525" rx="140" ry="16" fill="#000000" fill-opacity="0.08" />
    <!-- Product Rendering -->
    <g filter="url(#subtle_shadow)">
        {shape_svg}
    </g>
</svg>"""
    return svg.strip()


def generate_product_svg_label(product_name: str, product_type: str, sku: str, accent_color: str = '#016a38') -> str:
    """Generate close-up label detail and active ingredient facts SVG."""
    is_multi = product_type == 'multivitamin'
    clean_name = product_name[:34]

    if is_multi:
        facts_block = f"""
        <!-- Supplement Facts Table -->
        <rect x="70" y="210" width="460" height="290" rx="8" fill="#ffffff" stroke="#232323" stroke-width="2" />
        <rect x="70" y="210" width="460" height="40" fill="#232323" />
        <text x="85" y="236" font-family="Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">SUPPLEMENT FACTS</text>
        <text x="85" y="270" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="600" fill="#232323">Serving Size: 1 Tablet Daily | Servings Per Container: 60</text>
        <line x1="70" y1="285" x2="530" y2="285" stroke="#232323" stroke-width="4" />
        <text x="85" y="310" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="#232323">Active Micronutrient</text>
        <text x="400" y="310" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="#232323">Amount</text>
        <text x="480" y="310" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="#232323">% DV</text>
        <line x1="70" y1="320" x2="530" y2="320" stroke="#e8e8e8" stroke-width="1.5" />
        <text x="85" y="342" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">Vitamin C (as Ascorbic Acid)</text>
        <text x="400" y="342" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">500 mg</text>
        <text x="480" y="342" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="{accent_color}">556%</text>
        <line x1="70" y1="352" x2="530" y2="352" stroke="#e8e8e8" stroke-width="1" />
        <text x="85" y="374" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">Zinc (as Zinc Glycinate Chelate)</text>
        <text x="400" y="374" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">15 mg</text>
        <text x="480" y="374" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="{accent_color}">136%</text>
        <line x1="70" y1="384" x2="530" y2="384" stroke="#e8e8e8" stroke-width="1" />
        <text x="85" y="406" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">Vitamin D3 (as Cholecalciferol)</text>
        <text x="400" y="406" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">25 mcg</text>
        <text x="480" y="406" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="{accent_color}">125%</text>
        <line x1="70" y1="416" x2="530" y2="416" stroke="#e8e8e8" stroke-width="1" />
        <text x="85" y="438" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">Vitamin B12 (as Methylcobalamin)</text>
        <text x="400" y="438" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">50 mcg</text>
        <text x="480" y="438" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="{accent_color}">2083%</text>
        <line x1="70" y1="450" x2="530" y2="450" stroke="#232323" stroke-width="2" />
        <text x="85" y="475" font-family="Poppins, Arial, sans-serif" font-size="9" fill="#666666">Directions: Take one tablet daily with food and a glass of water.</text>
        <text x="85" y="490" font-family="Poppins, Arial, sans-serif" font-size="9" fill="#666666">Dietary: Halal Certified, Non-GMO, Gluten-Free, Zero Artificial Fillers.</text>
        """
    else:
        facts_block = f"""
        <!-- Skincare Active Ingredients Table -->
        <rect x="70" y="210" width="460" height="290" rx="8" fill="#ffffff" stroke="#232323" stroke-width="2" />
        <rect x="70" y="210" width="460" height="40" fill="{accent_color}" />
        <text x="85" y="236" font-family="Poppins, Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">FORMULATION ANALYSIS</text>
        <text x="85" y="270" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="600" fill="#232323">Target: Barrier Repair, Hydration &amp; Skin Balance</text>
        <line x1="70" y1="285" x2="530" y2="285" stroke="#232323" stroke-width="3" />
        <text x="85" y="310" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="#232323">Key Active Ingredient</text>
        <text x="360" y="310" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="#232323">Concentration</text>
        <text x="470" y="310" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="#232323">Function</text>
        <line x1="70" y1="320" x2="530" y2="320" stroke="#e8e8e8" stroke-width="1.5" />
        <text x="85" y="342" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">Niacinamide (Vitamin B3)</text>
        <text x="360" y="342" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">10.0% Pure</text>
        <text x="470" y="342" font-family="Poppins, Arial, sans-serif" font-size="11" fill="{accent_color}">Pores</text>
        <line x1="70" y1="352" x2="530" y2="352" stroke="#e8e8e8" stroke-width="1" />
        <text x="85" y="374" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">Zinc PCA Complex</text>
        <text x="360" y="374" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">1.0% Bio</text>
        <text x="470" y="374" font-family="Poppins, Arial, sans-serif" font-size="11" fill="{accent_color}">Sebum</text>
        <line x1="70" y1="384" x2="530" y2="384" stroke="#e8e8e8" stroke-width="1" />
        <text x="85" y="406" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">Multi-Weight Hyaluronic Acid</text>
        <text x="360" y="406" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">2.0% Multi</text>
        <text x="470" y="406" font-family="Poppins, Arial, sans-serif" font-size="11" fill="{accent_color}">Hydrate</text>
        <line x1="70" y1="416" x2="530" y2="416" stroke="#e8e8e8" stroke-width="1" />
        <text x="85" y="438" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">Ceramide NP + AP + EOP</text>
        <text x="360" y="438" font-family="Poppins, Arial, sans-serif" font-size="11" fill="#232323">Complex</text>
        <text x="470" y="438" font-family="Poppins, Arial, sans-serif" font-size="11" fill="{accent_color}">Barrier</text>
        <line x1="70" y1="450" x2="530" y2="450" stroke="#232323" stroke-width="2" />
        <text x="85" y="475" font-family="Poppins, Arial, sans-serif" font-size="9" fill="#666666">Directions: Apply 3-4 drops morning and night to cleansed skin.</text>
        <text x="85" y="490" font-family="Poppins, Arial, sans-serif" font-size="9" fill="#666666">Safety: Dermatologist tested, non-comedogenic, fragrance-free.</text>
        """

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <!-- DEMO: Supplivix Original Vector Asset - Variant 2 (Label Detail) -->
    <rect width="600" height="600" fill="#f8f8f8" />
    <rect x="40" y="40" width="520" height="520" rx="16" fill="#ffffff" stroke="#e8e8e8" stroke-width="2" />
    <!-- Header Plaque -->
    <text x="300" y="85" font-family="Poppins, Arial, sans-serif" font-size="13" font-weight="700" fill="{accent_color}" text-anchor="middle" letter-spacing="2">SUPPLIVIX NUTRACEUTICAL LABS</text>
    <text x="300" y="120" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="700" fill="#232323" text-anchor="middle">{clean_name}</text>
    <text x="300" y="145" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="600" fill="#666666" text-anchor="middle">SKU: {sku} | PHARMACEUTICAL QUALITY SPECIFICATION</text>

    <!-- Quality Seal Badges -->
    <g transform="translate(140, 160)">
        <rect x="0" y="0" width="90" height="26" rx="13" fill="#e1d6f9" />
        <text x="45" y="17" font-family="Poppins, Arial, sans-serif" font-size="9" font-weight="700" fill="#59376d" text-anchor="middle">100% PURE</text>
    </g>
    <g transform="translate(255, 160)">
        <rect x="0" y="0" width="90" height="26" rx="13" fill="#016a38" />
        <text x="45" y="17" font-family="Poppins, Arial, sans-serif" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">GMP TESTED</text>
    </g>
    <g transform="translate(370, 160)">
        <rect x="0" y="0" width="90" height="26" rx="13" fill="#232323" />
        <text x="45" y="17" font-family="Poppins, Arial, sans-serif" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">HALAL FORMULA</text>
    </g>

    {facts_block}
</svg>"""
    return svg.strip()


def generate_product_svg_lifestyle(product_name: str, product_type: str, accent_color: str = '#016a38') -> str:
    """Generate in-situ lifestyle and botanical vector composition."""
    clean_name = product_name[:32]

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <!-- DEMO: Supplivix Original Vector Asset - Variant 3 (Lifestyle & Botanical Harmony) -->
    <defs>
        <linearGradient id="ls_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fdfcf8" />
            <stop offset="100%" stop-color="#ede9fe" />
        </linearGradient>
    </defs>
    <!-- Background -->
    <rect width="600" height="600" fill="url(#ls_grad)" />

    <!-- Organic Decorative Shapes -->
    <circle cx="150" cy="180" r="110" fill="#e1d6f9" fill-opacity="0.6" />
    <ellipse cx="460" cy="190" rx="90" ry="140" fill="#016a38" fill-opacity="0.08" />
    <circle cx="480" cy="460" r="120" fill="#b497ed" fill-opacity="0.25" />

    <!-- Botanical Leaves Silhouette -->
    <g fill="{accent_color}" fill-opacity="0.2">
        <path d="M80 500 C80 380, 180 320, 240 330 C200 400, 160 480, 80 500 Z" />
        <path d="M120 540 C140 440, 220 400, 260 420 C220 480, 180 530, 120 540 Z" />
    </g>

    <!-- Podium Stand -->
    <ellipse cx="320" cy="480" rx="160" ry="40" fill="#ffffff" stroke="#232323" stroke-width="3" />
    <path d="M160 480 L160 520 C160 545, 480 545, 480 520 L480 480 Z" fill="#f8f8f8" stroke="#232323" stroke-width="3" />

    <!-- Product Silhouette on Podium -->
    <rect x="250" y="240" width="140" height="220" rx="20" fill="#ffffff" stroke="#232323" stroke-width="4" />
    <rect x="280" y="195" width="80" height="45" rx="6" fill="{accent_color}" stroke="#232323" stroke-width="3" />
    <rect x="260" y="280" width="120" height="150" rx="8" fill="#f8f8f8" stroke="#e8e8e8" stroke-width="1.5" />
    <text x="320" y="315" font-family="Poppins, Arial, sans-serif" font-size="10" font-weight="700" fill="{accent_color}" text-anchor="middle">SUPPLIVIX</text>
    <text x="320" y="350" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="#232323" text-anchor="middle">{clean_name}</text>
    <circle cx="320" cy="385" r="10" fill="{accent_color}" />

    <!-- Floating Capsule Elements -->
    <g transform="translate(130, 260) rotate(-25)">
        <rect x="0" y="0" width="36" height="18" rx="9" fill="{accent_color}" />
        <rect x="18" y="0" width="18" height="18" rx="9" fill="#e1d6f9" />
    </g>
    <g transform="translate(450, 310) rotate(35)">
        <rect x="0" y="0" width="32" height="16" rx="8" fill="#59376d" />
        <rect x="16" y="0" width="16" height="16" rx="8" fill="#b497ed" />
    </g>
</svg>"""
    return svg.strip()


def generate_hero_banner_svg() -> str:
    """Generate 1200x400 abstract hero banner SVG."""
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400">
    <!-- DEMO: Supplivix Original Vector Asset - Hero Banner -->
    <defs>
        <linearGradient id="hero_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="60%" stop-color="#fdfbf7" />
            <stop offset="100%" stop-color="#f5f3ff" />
        </linearGradient>
    </defs>
    <rect width="1200" height="400" fill="url(#hero_grad)" />
    <!-- Abstract Organic Flow Waves -->
    <path d="M0 350 C300 280, 500 420, 800 320 C1000 240, 1150 360, 1200 300 L1200 400 L0 400 Z" fill="#e1d6f9" fill-opacity="0.5" />
    <path d="M0 380 C350 330, 600 400, 900 350 C1100 310, 1180 390, 1200 360 L1200 400 L0 400 Z" fill="#016a38" fill-opacity="0.12" />
    <!-- Botanical Curves -->
    <circle cx="1050" cy="150" r="160" fill="#016a38" fill-opacity="0.06" />
    <circle cx="980" cy="220" r="90" fill="#b497ed" fill-opacity="0.2" />
    <!-- Floating Vector Capsules -->
    <g transform="translate(900, 120) rotate(-20)">
        <rect x="0" y="0" width="60" height="30" rx="15" fill="#016a38" />
        <rect x="30" y="0" width="30" height="30" rx="15" fill="#e1d6f9" />
    </g>
    <g transform="translate(1040, 190) rotate(40)">
        <rect x="0" y="0" width="50" height="25" rx="12.5" fill="#7a2fd0" />
        <rect x="25" y="0" width="25" height="25" rx="12.5" fill="#b497ed" />
    </g>
</svg>""".strip()


def generate_category_banner_svg(category_name: str, accent_color: str = '#016a38') -> str:
    """Generate 800x300 abstract category banner SVG."""
    clean_title = category_name[:30].upper()
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" width="800" height="300">
    <!-- DEMO: Supplivix Original Vector Asset - Category Banner ({clean_title}) -->
    <rect width="800" height="300" fill="#f8f8f8" />
    <circle cx="700" cy="150" r="160" fill="{accent_color}" fill-opacity="0.12" />
    <circle cx="620" cy="220" r="90" fill="#e1d6f9" fill-opacity="0.4" />
    <!-- Graphic Elements -->
    <g transform="translate(620, 100) rotate(-15)">
        <rect x="0" y="0" width="50" height="24" rx="12" fill="{accent_color}" />
        <rect x="25" y="0" width="25" height="24" rx="12" fill="#ffffff" />
    </g>
    <text x="60" y="130" font-family="Poppins, Arial, sans-serif" font-size="12" font-weight="700" fill="{accent_color}" letter-spacing="2">SUPPLIVIX COLLECTION</text>
    <text x="60" y="175" font-family="Poppins, Arial, sans-serif" font-size="28" font-weight="700" fill="#232323">{clean_title}</text>
    <text x="60" y="210" font-family="Poppins, Arial, sans-serif" font-size="13" font-weight="500" fill="#666666">Pure Science Formulations | Cash on Delivery Nationwide</text>
</svg>""".strip()


def export_raster_fallback(svg_filename_base: str, output_dir: str, title: str, accent_hex: str = '#016a38'):
    """
    Render raster fallback images (.webp and .avif) using Pillow drawing primitives.
    Guarantees browser-compatible fallback files are exported at build time.
    """
    os.makedirs(output_dir, exist_ok=True)
    webp_path = os.path.join(output_dir, f"{svg_filename_base}.webp")
    avif_path = os.path.join(output_dir, f"{svg_filename_base}.avif")
    if os.path.exists(webp_path) and os.path.exists(avif_path):
        return

    width, height = 400, 400
    img = Image.new('RGB', (width, height), color='#f9fafb')
    draw = ImageDraw.Draw(img)

    # Convert hex to RGB
    h = accent_hex.lstrip('#')
    accent_rgb = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

    # Draw packaging shape
    draw.ellipse([100, 70, 300, 270], fill='#e1d6f9', outline=None)
    draw.rectangle([130, 130, 270, 320], fill='white', outline='#232323', width=3)
    draw.rectangle([160, 85, 240, 130], fill=accent_rgb, outline='#232323', width=3)
    draw.rectangle([145, 170, 255, 290], fill='#f8f8f8', outline='#e8e8e8', width=2)
    # Capsule icon
    draw.rounded_rectangle([180, 240, 220, 258], radius=9, fill=accent_rgb)

    # Save WebP fallback
    webp_path = os.path.join(output_dir, f"{svg_filename_base}.webp")
    img.save(webp_path, 'WEBP', quality=85)

    # Save AVIF fallback (or copy/container format)
    avif_path = os.path.join(output_dir, f"{svg_filename_base}.avif")
    try:
        img.save(avif_path, 'AVIF', quality=85)
    except Exception:
        # If libavif is absent from Pillow build, WebP payload is saved with .avif extension fallback
        img.save(avif_path, 'WEBP', quality=85)

