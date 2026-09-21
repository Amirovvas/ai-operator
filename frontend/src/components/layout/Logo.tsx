interface IProps {
  size?: number;
  className?: string;
}

// Знак AI Operator: монограмма "A" (две опоры + перекладина) с узлом-акцентом
// в правом верхнем углу. Рисуется через currentColor, поэтому цвет знака
// задаёт родитель: белый на тёмной плашке в сайдбаре, оранжевый в AI Chat.
export const LogoMark = ({ size = 20, className }: IProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={className}
    style={{ display: "block", flexShrink: 0 }}
  >
    <path
      d="M4.5 20.5 12 4l7.5 16.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.2 15h7.6"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="19.5" cy="4.5" r="1.9" fill="currentColor" />
  </svg>
);
