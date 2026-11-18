"""
Supplivix Neon Database Migration & Data Sync Tool
===================================================
Usage:
    .venv\\Scripts\\python.exe migrate_to_neon.py

This script:
1. Connects to your Neon PostgreSQL database specified in .env (DATABASE_URL)
2. Runs all Django database migrations on Neon
3. Imports the full catalog, Urdu translations, categories, and settings
4. Confirms healthy status and record counts
"""
import os
import sys
import subprocess

def run():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    sys.path.insert(0, backend_dir)

    from dotenv import load_dotenv
    load_dotenv(os.path.join(backend_dir, '.env'))

    db_url = os.environ.get('DATABASE_URL', '')
    if not db_url or 'neon.tech' not in db_url:
        print("[!] DATABASE_URL in .env is not currently pointing to a Neon database.")
        print("    Current DATABASE_URL:", db_url)
        print("    Please paste your Neon connection string in backend/.env like this:")
        print("    DATABASE_URL=postgresql://user:password@ep-xxxx.region.neon.tech/neondb?sslmode=require")
        return

    print(f"[*] Neon connection detected: {db_url.split('@')[-1] if '@' in db_url else 'configured'}")
    
    python_exe = sys.executable

    print("\n[1/3] Applying database migrations to Neon...")
    res = subprocess.run([python_exe, 'manage.py', 'migrate'], capture_output=False)
    if res.returncode != 0:
        print("[!] Migration failed. Please check your Neon credentials / network.")
        return

    json_data_path = os.path.join(backend_dir, 'initial_catalog_data.json')
    if os.path.exists(json_data_path):
        print("\n[2/3] Importing catalog data, Urdu translations, and categories to Neon...")
        res_load = subprocess.run([python_exe, 'manage.py', 'loaddata', 'initial_catalog_data.json'], capture_output=False)
        if res_load.returncode != 0:
            print("[!] loaddata returned non-zero code. You may need to review conflicts.")
        else:
            print("[+] Data imported successfully into Neon!")
    else:
        print("\n[2/3] initial_catalog_data.json not found, skipping data import.")

    print("\n[3/3] Verifying records in Neon...")
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    import django
    django.setup()
    from catalog.models import Product, Category
    from accounts.models import User

    p_count = Product.objects.count()
    c_count = Category.objects.count()
    u_count = User.objects.count()
    ur_count = Product.objects.exclude(description_ur='').count()

    print(f"  - Products: {p_count}")
    print(f"  - Products with Urdu: {ur_count}")
    print(f"  - Categories: {c_count}")
    print(f"  - Users/Admin: {u_count}")
    print("\n[SUCCESS] Supplivix is now running on Neon PostgreSQL!")

if __name__ == '__main__':
    run()

