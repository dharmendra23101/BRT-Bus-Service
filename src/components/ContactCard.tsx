interface ContactCardProps {
  name: string;
  role: string;
  emails: string[];
  phone: string;
}

const ContactCard = ({ name, role, emails, phone }: ContactCardProps) => {
  return (
    <div className="brt-card text-center border border-transparent hover:border-primary/20">
      <h3 className="text-xl font-bold mb-1 text-foreground tracking-tight">{name}</h3>
      <p className="text-primary font-semibold mb-3 text-sm uppercase tracking-wider">{role}</p>
      {emails.map((email) => (
        <p key={email} className="text-muted-foreground text-sm leading-relaxed">📧 {email}</p>
      ))}
      <p className="text-muted-foreground text-sm mt-2">📞 {phone}</p>
    </div>
  );
};

export default ContactCard;
