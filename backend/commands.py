import click
from flask.cli import with_appcontext
from backend.utils.encryption import field_encryptor  # FIXED: Use correct import path

@click.command('rotate-keys')
@with_appcontext
def rotate_keys_command():
    """Rotate encryption keys and re-encrypt all data."""
    click.echo('Starting key rotation...')
    success = field_encryptor.rotate_keys()
    if success:
        click.echo('Key rotation completed successfully.')
    else:
        click.echo('Key rotation failed. Check logs for details.')

@click.command('backup-keys')
@click.option('--directory', '-d', help='Backup directory (optional)')
@with_appcontext
def backup_keys_command(directory):
    """Create backups of all encryption keys."""
    click.echo('Starting key backup...')
    backup_path = field_encryptor.backup_all_keys(directory)
    click.echo(f'Keys backed up to: {backup_path}')

def register_commands(app):
    """Register custom Flask CLI commands."""
    app.cli.add_command(rotate_keys_command)
    app.cli.add_command(backup_keys_command)