export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      height: {
        'screen-dvh': '100dvh',
      },
      minHeight: {
        'screen-dvh': '100dvh',
      },
      maxHeight: {
        'screen-dvh': '100dvh',
      },

      // tuỳ chọn thêm nếu muốn modal nhỏ hơn full
      maxWidth: {
        '85dvh': '85dvh',
      }
    },
  },
  plugins: [],
};
