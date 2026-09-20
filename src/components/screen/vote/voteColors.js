const COLORS = ["#0d6efd", "#198754", "#dc3545", "#b85c00", "#6f42c1", "#087990", "#d63384", "#6c757d"];
export const validVoteColor = color => /^#[0-9a-f]{6}$/i.test(color || "");
export const choiceColor = (choice, index) => validVoteColor(choice.color) ? choice.color : COLORS[index % COLORS.length];
export const randomVoteColor = () => COLORS[crypto.getRandomValues(new Uint32Array(1))[0] % COLORS.length];
