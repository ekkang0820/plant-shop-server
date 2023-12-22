module.exports = function (sequelize, DataTypes) {
  const Cart = sequelize.define("Cart", {
    userMail: {
      type: DataTypes.STRING,
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
  });

  // 다른 모델과의 관계 설정 등 추가적인 설정이 필요하면 여기에 추가할 수 있습니다.

  return Cart;
};
