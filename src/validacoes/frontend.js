import Joi from "joi";

const schemaEmail = Joi.string()
    .trim()
    .email({
        minDomainSegments: 2,
        tlds: {
            allow: false
        }
    })
    .required();

window.validarEmailJoi = function (email) {

    const { error } = schemaEmail.validate(email);

    if (error) {

        return {
            valido: false,
            mensagem: "Informe um endereço de e-mail válido."
        };

    }

    return {
        valido: true,
        mensagem: ""
    };

};