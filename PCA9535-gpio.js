//Сделал опрос всех портоа по прерыванию 1-я версия
module.exports = function (RED) {
    const i2c = require('i2c-bus');
    const Gpio = require('onoff').Gpio;
    const INPUT_PORT_REG = 0x0;
    const INPUT_PORT_REG1 = 0x1;
    const OUTPUT_PORT_REG = 0x2;
    const OUTPUT_PORT_REG1 = 0x3;
    const CONFIG_REG = 0x6;
    const CONFIG_REG1 = 0x7;
    const DI1_ADRESS = 0x20;
    const DI2_ADRESS = 0x21;
    const DI_IRQ = 11;
    const DI_CONFIG_IN = 0xff;
    const DI_CONFIG_OUT = 0x00;
    let old_state_pin = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
    function setTrue(node) {
        node.status({ fill: "green", shape: "dot", text: "true" });
    }

    function setFalse(node) {
        node.status({ fill: "blue", shape: "dot", text: "false" });
    }

    function setWrongProperties(node) {
        node.status({ fill: "red", shape: "ring", text: "Wrong properties" });
    }

    function setOk(node) {
        node.status({ fill: "yellow", shape: "dot", text: "OK" });
    }

    function setWrongPayload(node) {
        node.status({ fill: "red", shape: "ring", text: "Wrong payload" });
    }
    function checkStatus(state) {
        return state.pin >= 1 && state.pin <= 16 && state.bus >= 0 && state.bus <= 7
    }

    function setStatus(node) {
        if (checkStatus(node)) setOk(node)
        else setWrongProperties(node)
    }

    function setNode(config, node) {
        RED.nodes.createNode(node, config);
        node.pin = parseInt(config.pin)
        node.bus = parseInt(config.bus)
        node.address = parseInt(config.address, 16) 
        node.gpioint = parseInt(config.gpioint)
    }

    function setNodeDI(config, node) {
        RED.nodes.createNode(node, config);
        node.pin = parseInt(config.pin)
        node.bus = parseInt(config.bus)
        node.address = parseInt(config.address, 16)
        node.gpioint = parseInt(config.gpioint)
    }

    function DI_CONTROLLER(config) {

        setNodeDI(config, this)
        setStatus(this)
        //выполнение при старте ноды
 //       let old_state_pin = false;
        let state_pin;
 //       setTimeout(function() {
            if (checkStatus(this)) {
                //запись текущей конфигурации пина
                //read actual config
                const i2cX = i2c.openSync(this.bus);
                i2cX.writeByteSync(DI1_ADRESS, CONFIG_REG, DI_CONFIG_IN);
                i2cX.writeByteSync(DI1_ADRESS, CONFIG_REG1, DI_CONFIG_IN);
                i2cX.writeByteSync(DI2_ADRESS, CONFIG_REG1, DI_CONFIG_IN);
// Функция чтения состояние пинов при старте
                let input = i2cX.readByteSync(DI1_ADRESS, INPUT_PORT_REG);      // Read date DI1-8
                let input1 = i2cX.readByteSync(DI1_ADRESS, INPUT_PORT_REG1);    // Read date DI9-16
                let input2 = i2cX.readByteSync(DI2_ADRESS, INPUT_PORT_REG);      // Read date Output for reset IRQ
                 input2 = i2cX.readByteSync(DI2_ADRESS, INPUT_PORT_REG1);    // Read date DI16-24
                //read actual DI 1-24
                var pin;
                for (pin=0; pin<25; pin++) {
                if (pin<=7) {
                state_pin = (input & (1 << pin));
                var msgs = new Array(24);
                    if (state_pin > 0) {
                            msgs [pin] = {payload: false}
                        } else {
                            msgs [pin] = {payload: true}
                        }
                    old_state_pin [pin] = state_pin;
                }
                if ((pin>=8) && (pin<=15)) {
                    state_pin = (input1 & (1 << pin-8));
                    var msgs = new Array(24);
                        if (state_pin > 0) {
                            msgs [pin] = {payload: false}
                        } else {
                            msgs [pin] = {payload: true}
                        old_state_pin [pin] = state_pin;
                    }   
                }
                 if ((pin>=16) && (pin<=24)) {
                    state_pin = (input2 & (1 << pin-16));
                    var msgs = new Array(24);
                        if (state_pin > 0) {
                            msgs [pin] = {payload: false}
                        } else {
                            msgs [pin] = {payload: true}
                        }
                        old_state_pin [pin] = state_pin;
                    } 
            }
            this.send(msgs);
/*
                if (this.pin <= 8) {
                    //read actual DI 1-8
                    let input = i2cX.readByteSync(this.address, INPUT_PORT_REG);
                    state_pin = (input & (1 << (this.pin - 1)));
                    if (state_pin > 0) {
                        var msg = {payload: false}
                        setFalse(this)
                    } else {
                        msg = {payload: true}
                        setTrue(this)
                    }
                    this.send(msg);
                    old_state_pin = state_pin;
                } else {
                    //read actual input 8-15
                    let input1 = i2cX.readByteSync(this.address, INPUT_PORT_REG1);
                    state_pin1 = (input1 & (1 << (this.pin - 9)));
                    if (state_pin1 > 0) {
                        msg = {payload: false}
                        setFalse(this)
                    } else {
                        msg = {payload: true}
                        setTrue(this)
                    }
                    old_state_pin1 = state_pin1;
                    this.send(msg);
                }
                */
            } else {
                setWrongProperties(this)
            }
  //      }, 3000);
        // выполнение чтения пинов при прерывании gpio
        const button = new Gpio(DI_IRQ, 'in', 'falling');
        button.watch((err, value) => {
            if (err) {
                throw err;
                this.status({fill:"red",shape:"ring",text:"error irq gpio"});
            } else { 
                const i2cX = i2c.openSync(this.bus);
                let input = i2cX.readByteSync(DI1_ADRESS, INPUT_PORT_REG);      // Read dtate DI1-8
                let input1 = i2cX.readByteSync(DI1_ADRESS, INPUT_PORT_REG1);    // Read dtate DI9-16
                let input2 = i2cX.readByteSync(DI2_ADRESS, INPUT_PORT_REG1);    // Read dtate DI16-24
                    //read actual DI 1-24
                var pin;
                for (pin=0; pin<25; pin++){
                if (pin<=7) {
                state_pin = (input & (1 << pin));
                if (state_pin !== old_state_pin[pin]) {                     // выводить только когда поменялось состояние
                    var msgs = new Array(24);
                    if (state_pin > 0) {
                        msgs [pin] = {payload: false}
                        setFalse(this)
                    } else {
                        msgs [pin] = {payload: true}
                        setTrue(this)
                    }
                    this.send(msgs);
                    old_state_pin [pin] = state_pin;
                }
                }
                if ((pin>=8) && (pin<=15)) {
                    state_pin = (input1 & (1 << pin-8));
                    if (state_pin !== old_state_pin[pin]) {                 // выводить только когда поменялось состояние
                        var msgs = new Array(24);
                        if (state_pin > 0) {
                            msgs [pin] = {payload: false}
                            setFalse(this)
                        } else {
                            msgs [pin] = {payload: true}
                            setTrue(this)
                        }
                        this.send(msgs);
                        old_state_pin [pin] = state_pin;
                    }   
                }
                 if ((pin>=16) && (pin<=24)) {
                    state_pin = (input2 & (1 << pin-16));
                    if (state_pin !== old_state_pin[pin]) {                 // выводить только когда поменялось состояние
                        var msgs = new Array(24);
                        if (state_pin > 0) {
                            msgs [pin] = {payload: false}
                            setFalse(this)
                        } else {
                            msgs [pin] = {payload: true}
                            setTrue(this)
                        }
                        this.send(msgs);
                        old_state_pin [pin] = state_pin;
                    }  
                }




                /*//read actual input
                if (this.pin <= 8) {
                    //read actual input 0-7
                    let input = i2cX.readByteSync(this.address, INPUT_PORT_REG);
                     state_pin = (input & (1 << (this.pin - 1)));
                    if (state_pin !== old_state_pin) {          // выводить только когда поменялось состояние
                        if (state_pin > 0) {
                            var msg = { payload: false}
                            setFalse(this)
                        } else {
                            msg = {payload: true}
                            setTrue(this)
                        }
                        this.send(msg);
                        old_state_pin=state_pin;
                    }else{}
                }
                else {
                    //read actual input 8-15
                    let input1 = i2cX.readByteSync(this.address, INPUT_PORT_REG1);
                    state_pin1 = (input1 & (1 << (this.pin - 9)));
                    if (state_pin1 !== old_state_pin1) {     // выводить только когда поменялось состояние
                        if (state_pin1 > 0) {
                            msg = { payload: false}
                            setFalse(this)
                        } else {
                            msg = { payload: true}
                            setTrue(this)
                        }
                        this.send(msg);
                        old_state_pin1=state_pin1;
                    }else{}
                }*/
            }

        }
    });
        process.on('SIGINT', _ => {
            button.unexport();
        });


    }
    RED.nodes.registerType("DI CONTROLLER", DI_CONTROLLER);

    function DOU_TCONTROLLER(config) {

        setNode(config, this)

        setStatus(this)

        if (checkStatus(this)) {
            const i2cX = i2c.openSync(this.bus);
            // read actual config 0-7
            if (this.pin <= 8) {
                let output = i2cX.readByteSync(this.address, OUTPUT_PORT_REG);
                output &= ~(1 << (9-this.pin-1));
                i2cX.writeByteSync(this.address, OUTPUT_PORT_REG, output);
                config = i2cX.readByteSync(this.address, CONFIG_REG);
                config &= ~(1 << (9-this.pin-1));
                i2cX.writeByteSync(this.address, CONFIG_REG, config);
            } else {
                // read actual config 8-15
                let output = i2cX.readByteSync(this.address, OUTPUT_PORT_REG1);
                output &= ~(1 << (this.pin-9));
                i2cX.writeByteSync(this.address, OUTPUT_PORT_REG1, output);
                config = i2cX.readByteSync(this.address, CONFIG_REG1);
                config &= ~(1 << (this.pin-9));
                i2cX.writeByteSync(this.address, CONFIG_REG1, config);
            }
        } else {
            setWrongProperties(this)
        }

        this.on('input', function (msg) {

            if (checkStatus(this)) {

                if (msg.payload === "true") msg.payload = true;
                if (msg.payload === "false") msg.payload = false;

                const i2cX = i2c.openSync(this.bus);

                //read actual output 0-7 
		if (this.pin <= 8) {
                let output = i2cX.readByteSync(this.address, OUTPUT_PORT_REG);
                if (msg.payload === true || msg.payload === 1) {
                    output |= (1 << (9-this.pin-1));
                    setTrue(this)
                } else if (msg.payload === false || msg.payload === 0) {
                    output &= ~(1 << (9-this.pin-1));
                    setFalse(this)
                } else {
                    setWrongPayload(this)
                }
                //write new output
                i2cX.writeByteSync(this.address, OUTPUT_PORT_REG, output);
		} else {
		 //read actual output 8-17
		let output = i2cX.readByteSync(this.address, OUTPUT_PORT_REG1);
                if (msg.payload === true || msg.payload === 1) {
                    output |= (1 << (this.pin-9));
                    setTrue(this)
                } else if (msg.payload === false || msg.payload === 0) {
                    output &= ~(1 << (this.pin-9));
                    setFalse(this)
                } else {
                    setWrongPayload(this)
                }
                //write new output
                i2cX.writeByteSync(this.address, OUTPUT_PORT_REG1, output);
		}
            } else {
                setWrongProperties(this)
            }
        });
        this.on('close', function() {               //Функция закрытия ноды - выключить за собой!
            if (checkStatus(this)) {
                const i2cX = i2c.openSync(this.bus);
                //read actual output 0-7
                if (this.pin <= 8) {
                    let output = i2cX.readByteSync(this.address, OUTPUT_PORT_REG);
                    output &= ~(1 << (9 - this.pin - 1));
                    i2cX.writeByteSync(this.address, OUTPUT_PORT_REG, output);
                } else {
                    //read actual output 8-17
                    let output = i2cX.readByteSync(this.address, OUTPUT_PORT_REG1);
                    output &= ~(1 << (this.pin - 9));
                    i2cX.writeByteSync(this.address, OUTPUT_PORT_REG1, output);
                }
            } else {
                setWrongProperties(this)
            }
        });
    }
    RED.nodes.registerType("DOUT CONTROLLER", DOU_TCONTROLLER);
}
