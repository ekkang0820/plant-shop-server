module.exports = function (sequelize, dataTypes) {
  const user = sequelize.define("User", {
    usermail: {
      type: dataTypes.STRING(300),
      allowNull: false,
    },
    userpw: {
      type: dataTypes.STRING(200),
      allowNull: false,
    },
    username: {
      type: dataTypes.STRING(200),
      allowNull: false,
    },
    address: {
      type: dataTypes.STRING(200),
      allowNull: false,
    },
    birth: {
      type: dataTypes.STRING(100),
      allowNull: false,
    },
    flag: {
      type: dataTypes.INTEGER(1),
      allowNull: false,
    },
  });
  return user;
};
