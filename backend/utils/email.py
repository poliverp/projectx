# backend/utils/email.py
from flask import current_app, render_template
from flask_mail import Message
from backend.extensions import mail
import threading

def send_async_email(app, msg):
    """Send email asynchronously with error handling"""
    with app.app_context():
        try:
            mail.send(msg)
            print(f"Email sent successfully to {msg.recipients}")
        except Exception as e:
            # Log the error but don't crash
            print(f"Email sending failed: {e}")
            print(f"Would have sent email with subject: {msg.subject}")
            print(f"To: {msg.recipients}")
            # Print email content for testing purposes
            print(f"Content (HTML): {msg.html[:200]}...")

def send_email(subject, recipients, html_body, text_body=None):
    """Send an email"""
    app = current_app._get_current_object()
    msg = Message(subject, recipients=recipients)
    msg.html = html_body
    if text_body:
        msg.body = text_body
    
    # Send email in a background thread
    threading.Thread(target=send_async_email, args=(app, msg)).start()

def send_admin_approval_request(user):
    """Send approval request to admin"""
    app_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
    approve_url = f"{app_url}/admin/approve/{user.approval_token}"
    
    subject = f"New User Registration: {user.username} from {user.firm}"
    admin_email = current_app.config.get('ADMIN_EMAIL', 'oliverpizarro@gmail.com')
    
    html = f"""
    <h1>New User Registration</h1>
    <p>A new user has registered and is waiting for approval:</p>
    <ul>
        <li><strong>Username:</strong> {user.username}</li>
        <li><strong>Email:</strong> {user.email}</li>
        <li><strong>Firm:</strong> {user.firm}</li>
        <li><strong>Registered at:</strong> {user.created_at}</li>
    </ul>
    <p>
        <a href="{approve_url}" style="padding: 10px 15px; background-color: #7A4D3B; color: white; text-decoration: none; border-radius: 4px;">
            Approve User
        </a>
    </p>
    <p>Or copy and paste this URL in your browser:</p>
    <p>{approve_url}</p>
    """
    
    text = f"""
    New User Registration
    
    A new user has registered and is waiting for approval:
    
    Username: {user.username}
    Email: {user.email}
    Firm: {user.firm}
    Registered at: {user.created_at}
    
    To approve this user, visit: {approve_url}
    """
    
    send_email(subject, [admin_email], html, text)

def send_user_approved_notification(user):
    """Send approval notification to user"""
    app_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
    login_url = f"{app_url}/login"
    
    subject = "Your ClerkLegal Account Has Been Approved"
    
    html = f"""
    <h1>Account Approved</h1>
    <p>Hello {user.username},</p>
    <p>Your ClerkLegal account has been approved. You can now log in and start using the platform.</p>
    <p>
        <a href="{login_url}" style="padding: 10px 15px; background-color: #7A4D3B; color: white; text-decoration: none; border-radius: 4px;">
            Login Now
        </a>
    </p>
    <p>Thank you for your patience.</p>
    <p>The ClerkLegal Team</p>
    """
    
    text = f"""
    Account Approved
    
    Hello {user.username},
    
    Your ClerkLegal account has been approved. You can now log in and start using the platform.
    
    Login here: {login_url}
    
    Thank you for your patience.
    
    The ClerkLegal Team
    """
    
    send_email(subject, [user.email], html, text)