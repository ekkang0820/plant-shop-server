const express = require("express");

function generateToken(usermail) {
  return jwt.sign({ usermail }, "1234", { expiresIn: "1h" });
}

const WebSocket = require("ws");
const app = express();
const port = 8080;
const http = require("http");
const models = require("./models");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const session = require("express-session"); // express-session 추가
const cookieParser = require("cookie-parser"); // cookie-parser 추가
const cors = require("cors");

const corsOptions = {
  origin: "http://localhost:3000", // 클라이언트의 정확한 URL을 명시
  credentials: true, // withCredentials 요청을 허용
};

const cartItems = [];

app.use(cors(corsOptions));
app.use(
  session({
    secret: "1234", // 세션 암호화 키
    resave: false, // 세션을 항상 저장할 지 여부 (false 권장)
    saveUninitialized: true, // 세션 저장 전에 초기화할 지 여부
    cookie: { secure: false }, // HTTPS를 사용하지 않는 경우 false로 설정
  })
);

app.use(cookieParser());
app.use(express.json());
app.use((req, res, next) => {
  // res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // 클라이언트 도메인을 여기에 지정
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); // 필요한 HTTP 메서드 지정
  res.header("Access-Control-Allow-Credentials", "true"); // credentials 설정이 필요한 경우

  if (req.method === "OPTIONS") {
    res.sendStatus(200); // preflight 요청에 대한 응답
  } else {
    next();
  }
});

/* function generateToken(usermail) {
  return jwt.sign({ usermail }, "1234", { expiresIn: "1h" });
} */

app.get("/api/user", authenticate, async (req, res) => {
  // 세션에서 사용자 정보를 가져옵니다.
  const user = req.session.user;
  /*  const server = http.createServer(app); */
  if (user) {
    // 로그인한 사용자인 경우 사용자 정보를 반환합니다.
    res.status(200).json({
      usermail: user.usermail,
      username: user.username,
      address: user.address,
      birth: user.birth,
      flag: user.flag,
    });
  } else {
    // 세션에 사용자 정보가 없는 경우 로그인하지 않은 것으로 처리합니다.
    res.status(401).send({ message: "로그인되지 않았습니다." });
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  }),
});

app.use("/uploads", express.static("uploads"));

const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: "/ws" });

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);

    // Handle the WebSocket message here
  });
  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

app.use(express.json());
/* app.use(cors()); */
function authenticate(req, res, next) {
  const user = req.session.user;

  if (user) {
    // 로그인한 사용자인 경우
    req.user = user; // 요청 객체에 사용자 정보를 추가
    next();
  } else {
    // 로그인하지 않은 경우
    res.status(401).send({ message: "로그인되지 않았습니다." });
  }
}

app.post("/login", async (req, res) => {
  try {
    const { usermail, userpw } = req.body;

    // 데이터베이스에서 사용자 찾기
    const user = await models.User.findOne({ where: { usermail } });

    // 사용자가 존재하고 비밀번호가 일치하는 경우
    if (user && user.userpw === userpw) {
      // 세션에 사용자 정보 저장
      req.session.user = {
        id: user.id,
        usermail: user.usermail,
        flag: user.flag,
      };

      // 로그인 성공 응답에 flag 값을 포함시킵니다.
      res.send({ message: "로그인 성공", flag: user.flag });
    } else {
      // 사용자가 없거나 비밀번호가 일치하지 않는 경우
      res.status(401).send({ message: "잘못된 이메일 또는 비밀번호입니다." });
    }
  } catch (error) {
    console.error(error);
    // 서버 오류 응답
    res.status(500).send({ message: "서버 오류" });
  }
});
app.post("/logout", (req, res) => {
  // 세션 삭제
  req.session.destroy();
  res.send({ message: "로그아웃 성공" });
});
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

app.get("/banners", (req, res) => {
  models.Banner.findAll({
    limit: 2,
  })
    .then((result) => {
      res.send({
        banners: result,
      });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("에러가 발생했습니다");
    });
});
app.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    // 데이터베이스에서 이메일 주소 검사
    const user = await models.User.findOne({ where: { usermail: email } });

    if (user) {
      // 이메일이 이미 존재하는 경우
      res.status(409).send({ message: "이미 사용 중인 이메일입니다." });
    } else {
      // 이메일이 존재하지 않는 경우
      res.send({ message: "사용 가능한 이메일입니다." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "서버 오류 발생" });
  }
});
app.get("/products", (req, res) => {
  models.Product.findAll({
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "name",
      "price",
      "createdAt",
      "seller",
      "imageUrl",
      "soldout",
    ],
  })
    .then((result) => {
      console.log("PRODUCTS : ", result);
      res.send({
        products: result,
      });
    })
    .catch((error) => {
      console.error(error);
      res.status(400).send("에러 발생");
    });
});
app.post("/products", (req, res) => {
  const body = req.body;
  const { name, description, price, seller, imageUrl } = body;
  if (!name || !description || !price || !seller || !imageUrl) {
    res.status(400).send("모든 필드를 입력해주세요");
  }
  models.Product.create({ description, price, seller, imageUrl, name })
    .then((result) => {
      console.log("상품 생성 결과 : ", result);
      res.send({
        result,
      });
    })
    .catch((error) => {
      console.error(error);
      res.status(400).send("상품 업로드에 문제가 발생했습니다");
    });
});

app.get("/products/:id", (req, res) => {
  const params = req.params;
  const { id } = params;
  models.Product.findOne({
    where: {
      id: id,
    },
  })
    .then((result) => {
      console.log("PRODUCT : ", result);
      res.send({
        product: result,
      });
    })
    .catch((error) => {
      console.error(error);
      res.status(400).send("상품 조회에 에러가 발생했습니다");
    });
});

app.post("/image", upload.single("image"), (req, res) => {
  const file = req.file;
  console.log(file);
  res.send({
    imageUrl: file.path,
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "서버 오류 발생" });
});

app.post("/api/cart/add", async (req, res) => {
  try {
    const { userMail, productId, quantity } = req.body;

    // 상품 가격 정보를 가져오는 로직
    const product = await models.Product.findByPk(productId);
    if (!product) {
      return res.status(404).send({ message: "상품을 찾을 수 없습니다." });
    }
    const totalPrice = product.price * quantity;

    // 장바구니에 상품 추가
    await models.Cart.create({
      userMail,
      productId,
      quantity,
      totalPrice,
    });

    res.status(200).json({ message: "장바구니에 추가되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "에러가 발생했습니다.", error });
  }
});
// 장바구니 목록 조회 엔드포인트
app.get("/api/cart", async (req, res) => {
  try {
    // 세션에서 현재 사용자 정보를 가져옵니다.
    const user = req.session.user;

    if (!user) {
      // 사용자 정보가 없으면 빈 배열을 반환합니다.
      return res.status(200).json([]);
    }

    // 현재 사용자의 장바구니 정보를 데이터베이스에서 조회합니다.
    const cartItems = await models.Cart.findAll({
      where: { userMail: user.usermail },
    });

    // 각 장바구니 항목에 대해 상품 정보를 추가로 조회합니다.
    const cartItemsWithProductInfo = await Promise.all(
      cartItems.map(async (item) => {
        const product = await models.Product.findByPk(item.productId);

        // 만약 상품 정보가 없거나 사라진 경우, 해당 항목을 제외합니다.
        if (product) {
          return {
            ...item.toJSON(),
            productName: product.name,
            // 필요한 다른 상품 정보를 추가할 수 있습니다.
          };
        }
        return null;
      })
    );

    // null이 아닌 항목만 필터링하여 응답합니다.
    const filteredCartItems = cartItemsWithProductInfo.filter(
      (item) => item !== null
    );

    res.status(200).json(filteredCartItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "에러가 발생했습니다.", error });
  }
});

app.delete("/api/cart/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await models.Cart.destroy({ where: { id } });

    if (deleted) {
      res.status(200).json({ message: "장바구니 항목이 제거되었습니다." });
    } else {
      res.status(404).send({ message: "해당 항목을 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "에러가 발생했습니다.", error });
  }
});
// 선택한 상품 구매 엔드포인트
/* app.post("/api/cart/purchase", async (req, res) => {
  const cartItems = req.body; // [{ productId, quantity }, ...]

  try {
    // Sequelize 트랜잭션 시작
    const transaction = await models.sequelize.transaction();

    try {
      for (const item of cartItems) {
        const product = await models.Product.findOne(
          {
            where: { id: item.productId },
          },
          { transaction }
        );

        if (!product || product.stock < item.quantity) {
          // 재고 부족, 트랜잭션 롤백
          await transaction.rollback();
          return res
            .status(400)
            .send({ message: "재고 부족으로 구매할 수 없습니다." });
        }

        // 재고 감소
        await models.Product.update(
          { stock: product.stock - item.quantity },
          { where: { id: item.productId } },
          { transaction }
        );

        // 장바구니에서 아이템 삭제
        await models.Cart.destroy({
          where: { id: item.id },
          transaction,
        });
        await models.Purchase.create(
          {
            userMail: req.session.user.usermail,
            productId: item.productId,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            purchasedAt: new Date(),
          },
          { transaction }
        );
      }

      // 모든 작업 성공, 트랜잭션 커밋
      await transaction.commit();
      res.send({ message: "구매가 성공적으로 완료되었습니다." });
    } catch (error) {
      // 에러 발생, 트랜잭션 롤백
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("서버 오류로 구매에 실패했습니다.");
  }
});
 */
app.post("/purchase/:id", async (req, res) => {
  const { id } = req.params;
  const { userMail, quantity } = req.body; // 클라이언트로부터 userMail과 quantity 받기

  try {
    const transaction = await models.sequelize.transaction();

    const product = await models.Product.findOne(
      {
        where: { id: id },
      },
      { transaction }
    );

    if (!product || product.soldout < quantity) {
      await transaction.rollback();
      return res.status(400).send("더 이상 구매할 수 없는 상품입니다.");
    }

    await models.Product.update(
      {
        soldout: product.soldout - quantity,
      },
      {
        where: { id: id },
        transaction,
      }
    );

    await models.Purchase.create(
      {
        userMail: userMail,
        productId: id,
        quantity: quantity,
        totalPrice: product.price * quantity,
        purchasedAt: new Date(),
      },
      { transaction }
    );

    await transaction.commit();
    res.send("구매가 완료되었습니다.");
  } catch (error) {
    console.error(error);
    res.status(500).send("서버 오류가 발생했습니다.");
  }
});

app.post("/api/cart/purchase", async (req, res) => {
  const cartItems = req.body;
  console.log("Cart items received:", cartItems);

  try {
    // SQLite 트랜잭션 시작
    const transaction = await models.sequelize.transaction();

    try {
      const purchaseRecords = []; // 구매 내역을 저장할 배열

      // 장바구니 아이템에 대한 구매 처리
      for (const item of cartItems) {
        const product = await models.Product.findOne(
          {
            where: { id: item.productId },
          },
          { transaction }
        );

        if (!product || product.stock < item.quantity) {
          // 재고 부족, 트랜잭션 롤백
          await transaction.rollback();
          return res
            .status(400)
            .send({ message: "재고 부족으로 구매할 수 없습니다." });
        }

        // 재고 감소
        await models.Product.update(
          { stock: product.stock - item.quantity },
          { where: { id: item.productId } },
          { transaction }
        );

        // 구매 내역 저장
        //const totalPrice = product.price * item.quantity;
        // console.log(
        //   `Total price for product ID ${item.productId}: ${totalPrice}`
        // );

        //const userMail = req.session.user?.usermail;
        await models.Purchase.create(
          {
            userMail: item.userMail,
            productId: item.productId,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            purchasedAt: new Date(),
          },
          { transaction }
        );
      }

      // 구매 처리된 장바구니 아이템 삭제
      await models.Cart.destroy({
        where: {
          id: cartItems.map((item) => item.id),
        },
        transaction,
      });

      // 모든 작업 성공, 트랜잭션 커밋
      await transaction.commit();
      res.send({ message: "구매가 성공적으로 완료되었습니다." });
    } catch (error) {
      // 에러 발생, 트랜잭션 롤백
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(`서버 오류로 구매 처리에 실패했습니다: ${error.message}`);
  }
});

app.get("/api/purchases/:email", async (req, res) => {
  try {
    const userMail = req.params.email;
    const purchases = await models.Purchase.findAll({
      where: { userMail: userMail },
    });

    // 각 구매에 대한 상품 정보를 추가로 조회
    const purchasesWithProductInfo = await Promise.all(
      purchases.map(async (purchase) => {
        const product = await models.Product.findByPk(purchase.productId);
        // 상품이 존재하지 않을 경우 기본 값을 설정
        const productName = product ? product.name : "현재는 없는 상품입니다.";
        const imageUrl = product ? product.imageUrl : "uploads\\no.jpg";

        return {
          ...purchase.get({ plain: true }),
          product: { name: productName, imageUrl: imageUrl },
        };
      })
    );

    res.json(purchasesWithProductInfo);
  } catch (error) {
    console.error("구매 내역 조회 에러:", error);
    res.status(500).send("구매 내역을 조회하는 도중 오류가 발생했습니다.");
  }
});

app.delete("/products/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    // 데이터베이스에서 해당 상품을 찾고 삭제
    const deletedProduct = await models.Product.destroy({
      where: { id: productId },
    });

    if (deletedProduct) {
      res.status(204).send(); // 성공적으로 삭제됐을 때 204 No Content 응답
    } else {
      res.status(404).send({ message: "해당 상품을 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "상품 삭제 중 오류가 발생했습니다." });
  }
});

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, price, seller, description, imageUrl } = req.body;

  try {
    // 상품을 데이터베이스에서 찾고 업데이트
    const product = await models.Product.findByPk(id);

    if (!product) {
      return res.status(404).send({ message: "상품을 찾을 수 없습니다." });
    }

    product.name = name;
    product.price = price;
    product.seller = seller;
    product.description = description;
    product.imageUrl = imageUrl;

    await product.save();

    res.status(200).send({ message: "상품이 업데이트되었습니다." });
  } catch (error) {
    console.error("상품 업데이트 중 오류 발생:", error);
    res.status(500).send({ message: "상품 업데이트 중 오류가 발생했습니다." });
  }
};

module.exports = {
  updateProduct,
};
app.post("/uploadImage", upload.single("image"), (req, res) => {
  const imageUrl = req.file.path; // 업로드된 이미지의 경로를 사용할 수 있도록 설정해야 합니다.
  res.json({ imageUrl });
});

// 상품 정보 업데이트 엔드포인트 (상세 내용은 기존과 동일)
app.put("/products/:id", async (req, res) => {
  const productId = req.params.id;
  const updatedProduct = req.body;

  try {
    // 데이터베이스에서 해당 ID의 상품을 찾음
    const product = await models.Product.findOne({
      where: {
        id: productId,
      },
    });

    if (!product) {
      // 상품이 존재하지 않으면 404 Not Found를 응답
      return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    }

    // 찾은 상품을 업데이트
    await product.update(updatedProduct);

    res.json({ message: "상품이 업데이트되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "상품 업데이트 중 오류가 발생했습니다." });
  }
});

app.get("/api/total-sales", (req, res) => {
  res.json(totalSalesData);
});

app.get("/api/sales-data", (req, res) => {
  res.json(dailySalesData);
});
const { Op } = require("sequelize"); // Sequelize 연산자 임포트

app.get("/api/purchases", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereClause = {}; // 쿼리 조건을 담을 객체 생성

    // 시작 날짜와 종료 날짜가 제공되었다면 쿼리 조건에 추가
    if (startDate && endDate) {
      whereClause.purchasedAt = {
        [Op.between]: [startDate, endDate], // Sequelize 연산자 사용
      };
    }

    const purchases = await models.Purchase.findAll({
      where: whereClause, // 쿼리 조건을 적용
    });

    res.json(purchases);
  } catch (error) {
    console.error("매출 조회 에러:", error);
    res.status(500).send("매출을 조회하는 도중 오류가 발생했습니다.");
  }
});
app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
  console.log("강은규의 쇼핑몰 서버가 돌아가고 있습니다");
  models.sequelize
    .sync()
    .then(() => {
      console.log("DB 연결 성공!");
    })
    .catch((err) => {
      console.error(err);
      console.log("DB 연결 에러ㅠ");
      process.exit();
    });
});
app.post("/signup", async (req, res) => {
  try {
    // 요청 본문에서 사용자 정보 추출
    const { usermail, userpw, username, address, birth } = req.body;

    // 입력값 검증
    if (!usermail || !userpw || !username || !address || !birth) {
      return res.status(400).send({ message: "모든 필드를 입력해야 합니다." });
    }

    // 이메일 중복 검사
    const existingUser = await models.User.findOne({ where: { usermail } });
    if (existingUser) {
      return res.status(409).send({ message: "이메일이 이미 사용 중입니다." });
    }

    // 사용자 생성
    const newUser = await models.User.create({
      usermail,
      userpw,
      username,
      address,
      birth,
      flag: 0, // 기본값 설정
    });

    res.status(201).send({ message: "회원가입 성공", userId: newUser.id });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "서버 오류" });
  }
});
module.exports = app;
