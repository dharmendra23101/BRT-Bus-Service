interface FooterProps {
  text?: string;
}

const Footer = ({ text = "© 2027 Bus Services. All Rights Reserved." }: FooterProps) => {
  return (
    <footer className="brt-footer">
      <p>{text}</p>
    </footer>
  );
};

export default Footer;
