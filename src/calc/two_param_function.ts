import { err, ok, Result } from '../neverthrow/neverthrow';
import { Table } from '../table';
import { Cell, checkChildLength, checkType, ValueProvider } from './ast_utils';
import { Source } from './calc';
import { FloatOrMilliseconds, Value } from './results';
import Decimal from 'decimal.js';
import { IToken } from 'ebnf';

export class TwoParamFunctionCall implements ValueProvider {
    private readonly param1: Source;
    private readonly param2: Source;
    private readonly functionName: string;
    private readonly op: (value1: Value, value2: Value) => Value;

    constructor(ast: IToken, table: Table) {
        const typeError = checkType(ast, 'two_param_function_call');
        if (typeError) {
            throw typeError;
        }

        const lengthError = checkChildLength(ast, 3);
        if (lengthError) {
            throw lengthError;
        }

        const childTypeError = checkType(ast.children[0], 'two_param_function');
        if (childTypeError) {
            throw childTypeError;
        }

        const functionName = ast.children[0].text;
        this.functionName = functionName;
    switch (functionName) {
      case 'log':
        this.op = log;
        break;
      case 'pow':
        this.op = pow;
        break;
      default:
        throw Error('Unsupported two param function call: ' + functionName);
    }

        this.param1 = new Source(ast.children[1], table);
        this.param2 = new Source(ast.children[2], table);
    }

    public getValue = (table: Table, cell: Cell): Result<Value, Error> =>
        this.param1.getValue(table, cell).andThen((sourceData1) =>
            this.param2.getValue(table, cell).andThen((sourceData2) => {
                if (!sourceData1.getArity().isCell()) {
                    return err(new Error(`First argument to ${this.functionName} must be a single cell.`));
                }
                if (!sourceData2.getArity().isCell()) {
                    return err(new Error(`Second argument to ${this.functionName} must be a single cell.`));
                }

                return ok(this.op(sourceData1, sourceData2));
            }),
        );
}

/**
 * Return the logarithm of the first value with respect to the second value.
 */
const log = (value1: Value, value2: Value): Value => {
    const logValue = Decimal.log(
        FloatOrMilliseconds(value1.val[0][0]),
        FloatOrMilliseconds(value2.val[0][0]),
    );

    return new Value([[logValue.toString()]]);
};


/** * Return the first value raised to the power of the second value.
 */
const pow = (value1: Value, value2: Value): Value => {
    const powValue = FloatOrMilliseconds(value1.val[0][0]).pow(
        FloatOrMilliseconds(value2.val[0][0]),
    );

    return new Value([[powValue.toString()]]);
};
