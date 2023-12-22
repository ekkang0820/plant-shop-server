module.exports = function (sequelize, DataTypes) {
  const Purchase = sequelize.define("Purchase", {
    userMail: {
      type: DataTypes.STRING, // 이메일이므로 문자열로 변경
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalPrice: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    purchasedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW, // 구매 날짜, 기본값은 현재 시간
    },
  });

  // 필요한 경우 다른 모델과의 관계를 설정할 수 있습니다.
  // 예: Purchase.belongsTo(models.User); // 사용자 모델과의 관계

  return Purchase;
};
