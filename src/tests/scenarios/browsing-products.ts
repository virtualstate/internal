import {addOrder, addProduct, getOrder, listProducts, setOrder} from "../../data";
import {ok} from "../../is";
import { addOrderItem, listOrderProducts} from "../../data";
import { Chance } from "chance";

const chance = new Chance();

{
    let products = await listProducts();

    // while (products.length < 3) {
    //     await addProduct({
    //         productName: chance.name()
    //     });
    //     products = await listProducts();
    // }

    ok(products.length >= 3, "Some products should be already seeded")

    const { orderId } = await addOrder({
        status: "pending", // Pending cart order
    });

    const defaultToQuantityOne = await addOrderItem({
        orderId,
        productId: products[0].productId
    });
    ok(defaultToQuantityOne.quantity === 1);
    ok(defaultToQuantityOne.identifiers);
    ok(Array.isArray(defaultToQuantityOne.identifiers));

    await addOrderItem({
        orderId,
        productId: products[1].productId
    })

    const orderProductsTwo = await listOrderProducts(orderId);

    console.log(orderProductsTwo);

    ok(orderProductsTwo.length === 2);

    await setOrder({
        orderId,
        status: "submitted"
    });

    const submittedOrder = await getOrder(orderId);
    ok(submittedOrder.status === "submitted");
    ok(submittedOrder.products);
    ok(submittedOrder.products.length === 2);



}

export {};