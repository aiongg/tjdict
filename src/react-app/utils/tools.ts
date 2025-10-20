const circledNumbers = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];

export const getCircledNumber = (num: number): string => {
	if (num >= 0 && num <= 20) {
		return circledNumbers[num];
	}
	return num.toString();
};
