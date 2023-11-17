import {
    addInventory,
    addInventoryItem,
    addOffer,
    addOrder,
    addOrderItem, addOrderItems,
    addPayment,
    addPaymentMethod,
    addShipment,
    getOrganisation,
    Identifier,
    listInventoryItems,
    listInventoryProducts,
    listOffers,
    listOrderProducts,
    listOrders,
    listProducts,
    setInventoryItem,
    setOrder, setOrderItems,
    setOrganisation,
    setPayment,
    setPaymentMethod,
    setShipment,
    ShipmentFrom,
    ShipmentTo
} from "../../data";
import {ok} from "../../is";
import {v4, v5} from "uuid";
import {Chance} from "chance";
import {addLocation} from "../../data/location";
import {getOrderPrice} from "../../data/order-item/get-order-item-info";

const chance = new Chance();

const namespace = "737f2826-b4c3-40ba-b1f5-1f7766439c9d";
const organisationId = v5("organisationId", namespace);
const userId = v5("userId", namespace);

{
    let products = await listProducts();

    await setOrganisation({
        organisationName: chance.company(),
        ...await getOrganisation(organisationId),
        organisationId,
    });


    ok(products.length >= 3, "Some products should be already seeded");

    {
        for (const { productId } of products) {
            const offers = await listOffers({
                productId,
                organisationId
            });

            // If there aren't any offers yet, make some available!
            if (!offers.length) {
                await addOffer({
                    status: "available",
                    items: [
                        {
                            type: "product",
                            productId
                        }
                    ],
                    organisationId,
                    price: chance.floating({ min: 1, max: 10000 })
                        .toFixed(2)
                });
            }
        }
    }

    // A third party reference that can be recognised
    // In other software, this should be human-readable
    const reference = v4();

    const { locationId } = await addLocation({
        type: "place",
        organisationId
    });

    {
        const to: ShipmentTo = {
          address: [
              chance.address(),
              chance.city()
          ],
          countryCode: "NZL",
          userId
        };

        const from: ShipmentFrom = {
            locationId,
            organisationId,
        };

        let order = await addOrder({
            status: "pending", // Pending cart order,
            reference,
            from,
        });
        const { orderId } = order;

        const lookingFor = Array.from({ length: 3 }, () => ({
            productId: pick(products).productId,
            quantity: chance.integer({ min: 1, max: 20 })
        } as const))


        for (const { productId, quantity } of lookingFor) {
            const offers = await listOffers({
                productId
            });

            const justProduct = offers.find(offer => (
                offer.items.length === 1 &&
                (!offer.items[0].quantity || offer.items[0].quantity === 1)
            )) ;
            ok(justProduct);

            await addOrderItem({
                orderId,
                offerId: justProduct.offerId,
                quantity
            });
        }

        const price = await getOrderPrice(orderId);
        console.log(price);
        ok(price, "Price should be above 0");

        {
            // Provide an address for shipping
            order = await setOrder({
                ...order,
                to
            });
        }

        {
            // Add a new payment method
            let paymentMethod = await addPaymentMethod({
                status: "pending",
                type: "realtime",
                userId: order.to.userId
            });
            const { paymentMethodId, type: paymentType } = paymentMethod

            {
                // Verify payment method and confirm its availability for use
                paymentMethod = await setPaymentMethod({
                    ...paymentMethod,
                    status: "available"
                })
            }

            {
                // Make a payment using the verified payment method
                let payment = await addPayment({
                    paymentMethodId,
                    type: paymentType,
                    status: "pending",
                    userId: paymentMethod.userId
                });
                const { paymentId } = payment;

                {
                    // Mark the payment as processing
                    payment = await setPayment({
                        ...payment,
                        status: "processing"
                    });

                    {
                        // Verify the payment and update the order to include payment
                        payment = await setPayment({
                            ...payment,
                            status: "paid"
                        });
                        order = await setOrder({
                            ...order,
                            paymentMethodId,
                            paymentId
                        })
                    }
                }

            }
        }

        {
            // Now the order is paid for, submit the order
            order = await setOrder({
                ...order,
                status: "submitted"
            });
            ok(order.to, "Expected shipping address after submitting");
        }
    }

    {
        const submittedOrders = await listOrders({
            status: "submitted",
            from: {
                organisationId
            }
        });
        let mostRecent = submittedOrders.at(-1);

        // If this is not true, then maybe are there tests running at the same time?
        // At time of writing this, they are serial tests
        ok(mostRecent.reference === reference, "Expected the most recent order to be the just submitted order")

        ok(mostRecent.to, "Expected shipping address before processing");

        // Mark the order as processing to indicate to the customer
        // that things are happening
        mostRecent = await setOrder({
            ...mostRecent,
            status: "processing"
        });

        const { orderId } = mostRecent;

        // Inventory shelf just for this order when it comes in
        // Extra priority!
        const { inventoryId } = await addInventory({
            type: "inventory",
            organisationId
        })

        // Ensure we have everything in stock
        {
            const orderedProducts = await listOrderProducts(orderId, true);

            const partner = {
                address: [
                    chance.address(),
                    chance.city()
                ],
                countryCode: "NZL"
            };

            {
                // Submit the order to our partner... whoever that is
                // Ask them to send it to our location
                const { orderId } = await addOrder({
                    status: "submitted",
                    from: partner,
                    to: {
                        locationId,
                        inventoryId,
                        organisationId
                    }
                });

                await addOrderItems(
                    orderedProducts
                        .map(({ productId, quantity }) => ({ productId, quantity, orderId }))
                )
            }

            {
                // We received the orders from the partner!
                for (const { productId, quantity } of orderedProducts) {
                    await addInventoryItem({
                        status: "available",
                        from: partner,
                        to: {
                            locationId,
                            inventoryId,
                            organisationId
                        },
                        inventoryId,
                        productId,
                        quantity,
                        identifiers: Array.from({ length: quantity }, () => ({
                            type: "barcode",
                            identifier: v4(),
                            identifiedAt: new Date().toISOString()
                        }))
                    })
                }
            }
        }


        // Pick the order ready for shipping

        const picking = await addLocation({
            type: "picking",
            organisationId
        });

        const pickingInventory = await addInventory({
            type: "picking",
            locationId: picking.locationId,
            organisationId
        });

        {

            const availableProducts = await listInventoryProducts({
                inventoryId,
                status: "available"
            }, true);

            const orderProducts = await listOrderProducts(orderId);

            const productIds = [...new Set(orderProducts.map(product => product.productId))];

            const barcodes = new Map(
                productIds.map(
                    productId => {
                        const matching = availableProducts.filter(
                            product => product.productId === productId
                        );
                        const barcodes = matching
                            .flatMap<Identifier>(
                                product => (product.identifiers ?? [])
                            )
                            .filter(
                                identifier => identifier.type === "barcode"
                            );

                        return [productId, barcodes] as const;
                    }
                )
            );

            const allocated = new Map<string, Identifier[]>();

            for (const { productId, quantity = 1 } of orderProducts) {

                const identifiers = Array.from({ length: quantity }, () => barcodes.get(productId).pop());

                const productAllocated = allocated.get(productId) ?? [];
                productAllocated.push(...identifiers);
                allocated.set(productId, productAllocated);

                await addInventoryItem({
                    productId,
                    quantity,
                    inventoryId: pickingInventory.inventoryId,
                    identifiers: identifiers.map(identifier => ({
                        ...identifier,
                        identifiedAt: new Date().toISOString()
                    }))
                });
            }

            const allocatedProducts = availableProducts.filter(
                product => {
                    if (!product.identifiers) return false;
                    const productAllocated = allocated.get(product.productId);
                    if (!productAllocated) return false;
                    return productAllocated.find(identifier => product.identifiers.includes(identifier))
                }
            );

            const partial = allocatedProducts.filter(
                product => {
                    const productAllocated = allocated.get(product.productId);
                    return !productAllocated.every(identifier => product.identifiers.includes(identifier))
                }
            );

            const fullyAllocated = allocatedProducts.filter(
                product => !partial.includes(product)
            );

            // Record<productId, inventoryProductId>
            const productAllocationInventory: Record<string, ShipmentTo> = {};

            for (const [productId, identifiers] of allocated.entries()) {
                const { inventoryItemId } = await addInventoryItem({
                    status: "available",
                    inventoryId: pickingInventory.inventoryId,
                    productId,
                    quantity: identifiers.length,
                    identifiers
                });
                productAllocationInventory[productId] = {
                    inventoryItemId,
                    inventoryId: pickingInventory.inventoryId
                };
            }

            await Promise.all(
                fullyAllocated.map(
                    product => setInventoryItem({
                        ...product,
                        status: "void",
                        to: productAllocationInventory[product.productId]
                    })
                )
            );

            await Promise.all(
                partial.map(
                    async product => {
                        const allocatedIdentifiers = allocated.get(product.productId);
                        const usedIdentifiers = allocatedIdentifiers.filter(
                            identifier => product.identifiers.includes(identifier)
                        );
                        const remainingIdentifiers = product.identifiers.filter(
                            identifier => !usedIdentifiers.includes(identifier)
                        );

                        const target = await setInventoryItem({
                            ...product,
                            inventoryItemId: v4(),
                            status: "available",
                            identifiers: remainingIdentifiers
                        });

                        await setInventoryItem({
                            ...product,
                            inventoryItemId: v4(),
                            status: "split",
                            to: [
                                {
                                    inventoryId: target.inventoryId,
                                    inventoryItemId: target.inventoryItemId
                                },
                                productAllocationInventory[product.productId]
                            ]
                        });

                    }
                )
            );



        }

        // Pack the products
        {
            const pickedProducts = await listInventoryItems({
                inventoryId: pickingInventory.inventoryId,
                status: "available"
            });

            console.log(pickedProducts);
            ok(pickedProducts.length);

            const packageLocation = await addLocation({
                type: "packing"
            });
            const packageInventory = await addInventory({
                type: "packing",
                locationId: packageLocation.locationId
            });

            for (const product of pickedProducts) {

                const target = await setInventoryItem({
                    ...product,
                    inventoryId: packageInventory.inventoryId,
                    inventoryItemId: v4()
                });

                await setInventoryItem({
                    ...product,
                    status: "void",
                    to: {
                        inventoryId: target.inventoryId,
                        inventoryItemId: target.inventoryItemId
                    }
                });
            }

            // Ship the order!
            {
                let shipment = await addShipment({
                    status: "pending",
                    from: {
                        locationId,
                        inventoryId: packageInventory.inventoryId
                    },
                    to: mostRecent.to,
                    identifiers: [
                        {
                            type: "tracking",
                            identifier: v4(),
                            identifiedAt: new Date().toISOString()
                        }
                    ]
                })

                {
                    // Mark as ready for sending
                    shipment = await setShipment({
                        ...shipment,
                        status: "processing"
                    })
                }

                {
                    // Mark as sent
                    shipment = await setShipment({
                        ...shipment,
                        status: "sent"
                    })
                }

                {
                    // Mark as delivered
                    shipment = await setShipment({
                        ...shipment,
                        status: "delivered"
                    })
                }
            }
        }
    }

    function pick<T>(values: T[]): T {
        const index = Math.round(
            Math.random() * (values.length - 1)
        );
        return values[index] || values.find(Boolean);
    }
}