interface RouteCardProps {
  title: string;
  stops: string;
}

const RouteCard = ({ title, stops }: RouteCardProps) => {
  return (
    <div className="brt-card border border-transparent">
      <h3 className="text-lg font-bold mb-2 text-foreground tracking-tight">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{stops}</p>
    </div>
  );
};

export default RouteCard;
